import os
import json
import logging
import time
import uuid
import base64
import random
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional

import uvicorn
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Environment and API Key Setup ---
# Robustly find and load the .env file relative to the script's location
try:
    BASE_DIR = Path(__file__).resolve().parent
    ENV_PATH = BASE_DIR / ".env"
    if ENV_PATH.exists():
        load_dotenv(dotenv_path=ENV_PATH)
        logger.info(f"Loaded environment variables from: {ENV_PATH}")
    else:
        # Fallback for cases where .env might be in a parent directory
        load_dotenv()
        logger.info("Could not find .env file in script directory, attempting to load from current working directory.")
except Exception as e:
    logger.error(f"Error loading .env file: {e}")

API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("Please set the GOOGLE_API_KEY or GEMINI_API_KEY environment variable. Ensure a .env file is present in the same directory as this script.")

genai.configure(api_key=API_KEY)
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Vision and Chat API",
    description="A unified backend for image analysis and multi-entity conversations.",
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows your Next.js frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files for Image Uploads ---
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# --- Pydantic Models for API Data Validation ---

# Models for Vision Expert (/analyze)
class EntityAttribute(BaseModel):
    Description: str

class VisionEntity(BaseModel):
    id: str
    name: str
    category: str
    attributes: EntityAttribute

class AnalysisResponse(BaseModel):
    entities: List[VisionEntity]
    object_count: int
    image_url: str
    message: Optional[str] = None

# Models for Chat Expert (/chat/message)
class ChatEntity(BaseModel):
    id: str
    name: str
    category: str
    attributes: Dict[str, Any]

class ChatMessage(BaseModel):
    speaker: str
    content: str

class ChatRequest(BaseModel):
    entities: List[ChatEntity]
    history: List[ChatMessage] = Field(default_factory=list)
    user_message: str
    target_entity_id: str  # 'all' or a specific entity ID

# --- Vision Expert Logic ---

def extract_json_from_text(text: str) -> dict:
    """Safely extracts a JSON object from a string, even if it's embedded in other text."""
    try:
        # Find the start and end of the JSON object
        start_index = text.find('{')
        end_index = text.rfind('}') + 1
        if start_index == -1 or end_index == 0:
            logger.warning("No JSON object found in the text.")
            return {}
        
        json_str = text[start_index:end_index]
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {e}\nText was: {text}")
        return {}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyzes an uploaded image to identify and describe entities within it.
    This combines the logic from your original vision_expert.py.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Image saved to {file_path}")

        image_part = {"mime_type": file.content_type, "data": file_path.read_bytes()}

        prompt = (
            "Analyze the image to identify the most prominent objects. For each object, provide its name and a brief, one-sentence description. "
            "Return the output as a single, valid JSON object only. Do not include any other text or markdown formatting. "
            "The JSON should follow this exact structure: "
            '{"items": [{"name": "object name", "description": "short description"}]}'
        )
        
        model = genai.GenerativeModel(MODEL_NAME)
        response = await model.generate_content_async([prompt, image_part])

        # Safely extract text from response
        text_content = ""
        if response.candidates and response.candidates[0].content.parts:
            text_content = response.candidates[0].content.parts[0].text
        
        if not text_content:
             raise HTTPException(status_code=500, detail="Failed to get a valid response from the model.")

        data = extract_json_from_text(text_content)
        
        entities = []
        items = data.get("items", [])
        if not isinstance(items, list):
            logger.warning(f"Expected 'items' to be a list, but got {type(items)}")
            items = []

        for item in items:
            if isinstance(item, dict) and "name" in item and "description" in item:
                entities.append({
                    "id": str(uuid.uuid4()),
                    "name": item["name"],
                    "category": item.get("category", "Object"),
                    "attributes": {"Description": item["description"]}
                })
        
        return JSONResponse(content={
            "entities": entities,
            "object_count": len(entities),
            "image_url": f"/uploads/{file_path.name}"
        })

    except Exception as e:
        logger.error(f"An error occurred during image analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")
    finally:
        if file_path.exists():
            file_path.unlink()  # Clean up the uploaded file


# --- Chat Expert Logic ---

async def generate_agent_response(
    entity: ChatEntity,
    history: List[Dict[str, Any]],
    user_message: str,
    all_entity_names: List[str]
) -> str:
    """Generates a response from the perspective of a single entity agent."""
    
    other_entities_mentions = [f"@{name}" for name in all_entity_names if name != entity.name]
    
    system_prompt = (
        f"You are '{entity.name}', a {entity.category}. Your personality should reflect these known attributes: {json.dumps(entity.attributes)}. "
        "You are in a group chat with a human and other objects. You must speak only for yourself, in the first person ('I', 'me', 'my'). "
        "Keep your responses conversational, engaging, and concise, as if you were texting. "
        "If you want to address another entity, mention their name. "
        f"The other entities present are: {', '.join(other_entities_mentions) or 'none'}."
    )
    
    # Construct a message history for the model
    model_history = []
    for msg in history:
        # Use 'user' for human messages, 'model' for AI (entity) messages
        role = "user" if msg["speaker"] == "You" else "model"
        # For model responses, clarify which entity was speaking
        content = f"{msg['speaker']}: {msg['content']}" if role == 'model' else msg['content']
        model_history.append({"role": role, "parts": [{"text": content}]})

    # Add the current user message to the history for context
    model_history.append({"role": "user", "parts": [{"text": user_message}]})

    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=system_prompt,
        generation_config={"temperature": 0.75, "max_output_tokens": 250},
    )

    # Generate content based on the full history
    response = await model.generate_content_async(model_history)
    
    return response.text


async def get_next_speaker(
    history: List[Dict[str, Any]],
    user_message: str,
    entity_names: List[str]
) -> str:
    """An intelligent moderator agent to decide which entity should speak next."""
    
    # Create a concise summary of the last few turns for the moderator
    conversation_summary = "\n".join([f"{msg['speaker']}: {msg['content']}" for msg in history[-4:]])
    
    prompt = (
        "You are a silent group chat moderator. A user is talking to a group of entities. "
        "Your task is to determine which entity should speak next based on the recent conversation. "
        "Consider who was last addressed, the subject of the user's message, and who might have the most relevant response. "
        "Your output must be ONLY the name of one entity from the provided list.\n\n"
        f"Entities available: {', '.join(entity_names)}\n\n"
        "Recent Conversation:\n"
        f"{conversation_summary}\n"
        f"User's new message: \"{user_message}\"\n\n"
        "Who is the most logical speaker?"
    )

    model = genai.GenerativeModel(MODEL_NAME, generation_config={"temperature": 0.2})
    response = await model.generate_content_async(prompt)
    
    next_speaker_name = response.text.strip().replace("'", "").replace('"', '')
    
    # Fallback if the model returns an invalid name or no name
    if next_speaker_name not in entity_names:
        logger.warning(f"Moderator returned invalid name '{next_speaker_name}'. Choosing randomly.")
        # A simple fallback: if a name is mentioned, choose them. Otherwise, random.
        for name in entity_names:
            if name.lower() in user_message.lower():
                return name
        return random.choice(entity_names)
        
    return next_speaker_name


@app.post("/chat/message")
async def handle_chat_message(request: ChatRequest):
    """
    Handles incoming chat messages, routes them to the correct agent(s),
    and returns their responses.
    """
    try:
        target_id = request.target_entity_id
        all_entities = {e.id: e for e in request.entities}
        all_entity_names = [e.name for e in request.entities]
        
        responses = []

        if target_id != "all":
            # Direct message to a single entity
            if target_id not in all_entities:
                raise HTTPException(status_code=404, detail="Target entity not found.")
            
            target_entity = all_entities[target_id]
            content = await generate_agent_response(
                target_entity, [msg.dict() for msg in request.history], request.user_message, all_entity_names
            )
            responses.append({
                "speaker": target_entity.name,
                "speakerId": target_entity.id,
                "content": content,
            })
        else:
            # Group message, let the moderator decide the speaker
            if not all_entity_names:
                 raise HTTPException(status_code=400, detail="No entities available to chat with.")

            next_speaker_name = await get_next_speaker(
                 [msg.dict() for msg in request.history], request.user_message, all_entity_names
            )
            
            # Find the entity object for the chosen speaker
            speaker_entity = next((e for e in request.entities if e.name == next_speaker_name), None)

            if speaker_entity:
                content = await generate_agent_response(
                    speaker_entity, [msg.dict() for msg in request.history], request.user_message, all_entity_names
                )
                responses.append({
                    "speaker": speaker_entity.name,
                    "speakerId": speaker_entity.id,
                    "content": content,
                })
            else:
                 logger.error(f"Could not find entity object for speaker '{next_speaker_name}'")

        return JSONResponse(content=responses)

    except Exception as e:
        logger.error(f"An error occurred in the chat handler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal chat error occurred: {e}")

# --- Main Entry Point ---
if __name__ == "__main__":
    # Use port 8001 to match the frontend's fetch requests
    uvicorn.run(app, host="0.0.0.0", port=8001)

