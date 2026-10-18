import os
import json
import logging
import time
import uuid
import base64
import random
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import google.generativeai as genai
import google.generativeai.types as genai_types
import google.api_core.exceptions
from googleapiclient.errors import ResumableUploadError
import shutil
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define Finish Reasons
class FinishReason(str, Enum):
    STOP = "STOP"
    MAX_TOKENS = "MAX_TOKENS"
    SAFETY = "SAFETY"
    RECITATION = "RECITATION"

# --- CORRECTED INITIALIZATION SEQUENCE ---

# 1. Define the lifespan handler first
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting up...")
    yield
    logger.info("Application shutting down...")

# 2. Initialize the FastAPI app ONCE, including the lifespan
app = FastAPI(title="Image Analysis API", lifespan=lifespan)

# 3. Add CORS middleware to the app
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Mount static files to the app
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- END OF CORRECTION ---

# Env setup
BASE = Path(__file__).resolve().parent
APP_DIR = BASE if BASE.name == "app" else BASE.parent if BASE.name == "experts" else BASE
ENV_PATH = APP_DIR / ".env"
load_dotenv(ENV_PATH.as_posix())

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # Stable default
API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("Set GOOGLE_API_KEY or GEMINI_API_KEY in .env")

genai.configure(api_key=API_KEY)
logger.info("Gemini API configured successfully")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def extract_json_from_text(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        return {"items": [], "object_count": 0}
    json_str = text[start:end]
    try:
        data = json.loads(json_str)
        data.setdefault("items", [])
        data["object_count"] = len(data.get("items", []))
        return data
    except json.JSONDecodeError:
        logger.warning(f"JSON parse failed: {json_str[:200]}...")
        return {"items": [], "object_count": 0}

def upload_to_gemini_with_retries(file_path: Path, mime_type: str, max_retries: int = 10) -> genai.types.File:
    for attempt in range(max_retries):
        try:
            logger.info(f"Uploading to Gemini (attempt {attempt + 1}/{max_retries})")
            time.sleep(random.uniform(1, 3))  # Jitter
            return genai.upload_file(path=file_path, mime_type=mime_type)
        except (google.api_core.exceptions.ServiceUnavailable, ResumableUploadError) as e:
            logger.warning(f"Upload failed (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(2 ** min(attempt, 5))  # Backoff up to 32s
                continue
            raise HTTPException(status_code=503, detail="Gemini upload unavailable after retries. Try again later.")
        except Exception as e:
            logger.error(f"Unexpected upload error: {str(e)}")
            raise
    raise HTTPException(status_code=500, detail="Upload failed unexpectedly")

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    logger.info(f"Received: {file.filename}, type: {file.content_type}")
    
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file safely
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved: {file_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")
    
    uploaded_file = None
    use_base64 = True  # Default to base64 to bypass upload issues
    image_part = None
    
    try:
        # Check file size for base64 (limit ~10MB to avoid token bloat)
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        if file_size_mb > 10:
            logger.info("Large file (>10MB): Falling back to upload")
            use_base64 = False
        
        if use_base64:
            # Base64 inline (bypasses upload)
            with open(file_path, "rb") as img_file:
                img_data = base64.b64encode(img_file.read()).decode("utf-8")
            image_part = {"mime_type": file.content_type, "data": img_data}
            logger.info("Using base64 inline image")
        else:
            # Traditional upload with enhanced retries
            uploaded_file = upload_to_gemini_with_retries(file_path, file.content_type)
        
        # Prompt
        prompt = (
            'Analyze this image and return ONLY valid JSON: '
            '{"items": [{"name": "string", "description": "brief (1-2 sentences)"}], "object_count": integer}. '
            '1-5 prominent objects, basic details (type/color). Ignore people. Concise.'
        )
        
        # Model
        model = genai.GenerativeModel(
            model_name=MODEL,
            generation_config={"max_output_tokens": 1024, "temperature": 0.1},
            safety_settings={
                genai_types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai_types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                # ... (other categories)
            }
        )
        
        # Generate
        content = [prompt]
        if use_base64:
            content.append(image_part)
        else:
            content.append(uploaded_file)
        
        response = model.generate_content(content)
        
        # Handle response (similar to before)
        if not response.candidates:
            return JSONResponse(status_code=500, content={"entities": [], "image_url": f"/uploads/{unique_filename}", "message": "No response from Gemini"})
        
        candidate = response.candidates[0]
        finish_reason = str(candidate.finish_reason).upper()
        
        if finish_reason == FinishReason.MAX_TOKENS.value or candidate.finish_reason == 2:
            logger.warning("MAX_TOKENS - partial extract")
            message = "Truncated analysis. Try simpler image."
        
        if finish_reason in [FinishReason.SAFETY.value] or candidate.finish_reason == 3:
            return JSONResponse(
                status_code=200,
                content={
                    "entities": [],
                    "object_count": 0,
                    "image_url": f"/uploads/{unique_filename}",
                    "message": "Blocked by safety filters."
                }
            )
        
        # Extract text
        text = response.text.strip() if hasattr(response, 'text') and response.text else ""
        if not text and candidate.content and candidate.content.parts:
            text = " ".join(p.text for p in candidate.content.parts if hasattr(p, 'text') and p.text)
        text = text.strip()
        
        if not text:
            return JSONResponse(
                status_code=200,
                content={
                    "entities": [],
                    "object_count": 0,
                    "image_url": f"/uploads/{unique_filename}",
                    "message": "No analysis generated."
                }
            )
        
        data = extract_json_from_text(text)
        
        # Transform entities
        entities = []
        for item in data.get("items", []):
            if isinstance(item, dict) and "name" in item:
                entities.append({
                    "id": str(uuid.uuid4()),
                    "name": item["name"],
                    "category": item["name"].split()[0] if item["name"] else "Unknown",
                    "attributes": {"Description": item.get("description", "No desc")}
                })
        
        response_data = {
            "entities": entities,
            "object_count": len(entities),
            "image_url": f"/uploads/{unique_filename}"
        }
        if "message" in locals():
            response_data["message"] = message
        
        return JSONResponse(content=response_data)
        
    except google.api_core.exceptions.ServiceUnavailable as e:
        logger.error(f"Gemini unavailable: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "entities": [],
                "object_count": 0,
                "image_url": f"/uploads/{unique_filename}",
                "message": "Gemini service temporarily unavailable (overload). Try again later."
            }
        )
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        # Robust cleanup
        if file_path.exists():
            try:
                # unlink returns None on success, so checking for failure is tricky.
                # Just call it and catch exceptions.
                file_path.unlink()
                logger.info(f"Cleaned: {file_path}")
            except Exception as e:
                logger.warning(f"Cleanup failed for {file_path}: {str(e)}")
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception as e:
                logger.warning(f"Failed to delete uploaded file {uploaded_file.name}: {e}")