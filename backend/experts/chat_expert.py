# app/experts/chat_expert.py
import os
import json
import uvicorn
from pathlib import Path
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import google.generativeai as genai

# --- Configuration and Environment Loading ---
# This setup assumes the .env file is in the parent 'app' directory
APP_DIR = Path(__file__).resolve().parent.parent
load_dotenv(APP_DIR / ".env")

API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("Set GOOGLE_API_KEY or GEMINI_API_KEY in app/.env")

genai.configure(api_key=API_KEY)
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-latest")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Interactive Entity Chat API",
    description="Powers a turn-by-turn conversation with AI-powered entities.",
)

# CORS Middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for API Data Structure ---
class Entity(BaseModel):
    id: str
    name: str
    category: str
    attributes: Dict[str, Any]

class Message(BaseModel):
    speaker: str
    content: str

class ChatRequest(BaseModel):
    entities: List[Entity]
    history: List[Message] = Field(default_factory=list)
    user_message: str
    target_entity_id: str  # "all" or a specific entity ID

# --- Core Chat Logic ---
def generate_system_prompt(entity: Entity) -> str:
    """Creates a tailored system prompt for an entity agent."""
    return (
        f"You are speaking as the entity: '{entity.name}' (a {entity.category}). "
        f"Your known attributes are: {json.dumps(entity.attributes)}. "
        "Speak in the first person from this entity's perspective. "
        "Your responses should be concise, engaging, and directly related to the ongoing conversation. "
        "Stay in character. Do not mention that you are an AI model."
    )

def convert_history_for_gemini(history: List[Message]) -> List[Dict[str, Any]]:
    """Converts our simple message history to the format Gemini requires."""
    gemini_history = []
    for message in history:
        # Assign 'user' role to the human user, and 'model' to AI entities
        role = "user" if message.speaker == "You" else "model"
        gemini_history.append({"role": role, "parts": [message.content]})
    return gemini_history

# --- API Endpoint ---
@app.post("/chat/message")
async def handle_chat_message(request: ChatRequest) -> List[Dict[str, Any]]:
    """
    Receives a user message and returns responses from the targeted entities.
    """
    responses = []
    
    entities_to_respond = []
    if request.target_entity_id == "all":
        entities_to_respond = request.entities
    else:
        target_entity = next((e for e in request.entities if e.id == request.target_entity_id), None)
        if target_entity:
            entities_to_respond.append(target_entity)
        else:
            raise HTTPException(status_code=404, detail="Target entity not found.")

    if not entities_to_respond:
        return []

    gemini_history = convert_history_for_gemini(request.history)
    
    for entity in entities_to_respond:
        try:
            system_prompt = generate_system_prompt(entity)
            model = genai.GenerativeModel(
                model_name=MODEL_NAME,
                system_instruction=system_prompt,
            )
            chat_session = model.start_chat(history=gemini_history)
            
            ai_response = chat_session.send_message(request.user_message)
            
            responses.append({
                "speaker": entity.name,
                "speakerId": entity.id,
                "content": ai_response.text,
            })

        except Exception as e:
            print(f"Error for {entity.name}: {e}")
            responses.append({
                "speaker": entity.name,
                "speakerId": entity.id,
                "content": f"(I'm having trouble thinking right now. Error: {e})",
            })
            
    return responses

# --- Server Execution ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)