"""
OpenLense - Unified Multimodal AI Backend
========================================
Main application entry point that integrates:
1. Multimodal Vision Entity Extraction & Object Persona Group Chat
2. Document Parsing, FAISS Vector Indexing & Contextual RAG Chat (Groq / Llama 3)
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("openlense.backend")

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BASE_DIR.parent) not in sys.path:
    sys.path.insert(0, str(BASE_DIR.parent))

load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PORT = int(os.getenv("PORT", 8000))
GEMINI_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

UPLOAD_DIR = BASE_DIR / "upload"
UPLOAD_DIR.mkdir(exist_ok=True)
EXPERTS_UPLOAD_DIR = BASE_DIR / "experts" / "uploads"
EXPERTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# Lifespan Handler
# -----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OpenLense Unified Backend...")
    if not GEMINI_KEY:
        logger.warning(
            "GOOGLE_API_KEY or GEMINI_API_KEY not found. Vision analysis endpoints will require key configuration."
        )
    if not GROQ_KEY:
        logger.warning(
            "GROQ_API_KEY not found. Document RAG endpoints will require key configuration."
        )
    yield
    logger.info("Shutting down OpenLense Backend...")

# -----------------------------------------------------------------------------
# FastAPI App Initialization
# -----------------------------------------------------------------------------
app = FastAPI(
    title="OpenLense API",
    description="Multimodal Visual Entity Conversation & Document RAG Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for image uploads
app.mount("/uploads", StaticFiles(directory=EXPERTS_UPLOAD_DIR), name="uploads")

# -----------------------------------------------------------------------------
# Root & Health Endpoints
# -----------------------------------------------------------------------------
@app.get("/", tags=["System"])
async def root():
    return {
        "name": "OpenLense Unified AI Backend",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "features": {
            "vision_analysis": "/analyze",
            "entity_chat": "/chat/message",
            "document_processing": "/process-documents/",
            "document_chat": "/chat/",
        },
        "services_configured": {
            "gemini": bool(GEMINI_KEY),
            "groq": bool(GROQ_KEY),
        }
    }

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "gemini_ready": bool(GEMINI_KEY),
        "groq_ready": bool(GROQ_KEY)
    }

# -----------------------------------------------------------------------------
# Delegated Routes to Experts
# -----------------------------------------------------------------------------
try:
    try:
        from backend.experts.chat_expert import app as chat_app
    except ImportError:
        from experts.chat_expert import app as chat_app

    for route in chat_app.routes:
        if route.path not in ["/docs", "/redoc", "/openapi.json", "/"]:
            app.routes.append(route)
except Exception as e:
    logger.warning(f"Could not directly integrate chat_expert routes: {e}")

try:
    try:
        from backend.experts.rag_expert import app as rag_app
    except ImportError:
        from experts.rag_expert import app as rag_app

    for route in rag_app.routes:
        if route.path not in ["/docs", "/redoc", "/openapi.json", "/"]:
            app.routes.append(route)
except Exception as e:
    logger.warning(f"Could not directly integrate rag_expert routes: {e}")

try:
    from backend.api.routes import api_router
    app.include_router(api_router)
except Exception as e:
    try:
        from api.routes import api_router
        app.include_router(api_router)
    except Exception:
        pass

# -----------------------------------------------------------------------------
# Dual-Mode Concurrent Runner
# -----------------------------------------------------------------------------
def run_dual_services():
    """Runs chat_expert on 8001 and rag_expert on 8002 concurrently."""
    import subprocess

    logger.info("Starting OpenLense in Dual-Service Mode:")
    logger.info(" - Vision & Persona Chat API: http://localhost:8001")
    logger.info(" - Document RAG API:          http://localhost:8002")

    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{env.get('PYTHONPATH', '')}"

    p1 = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "experts.chat_expert:app", "--host", "0.0.0.0", "--port", "8001"],
        cwd=str(BASE_DIR),
        env=env
    )
    p2 = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "experts.rag_expert:app", "--host", "0.0.0.0", "--port", "8002"],
        cwd=str(BASE_DIR),
        env=env
    )

    try:
        p1.wait()
        p2.wait()
    except KeyboardInterrupt:
        logger.info("Stopping dual services...")
        p1.terminate()
        p2.terminate()

# -----------------------------------------------------------------------------
# CLI Entry Point
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OpenLense Backend Server")
    parser.add_argument(
        "--mode",
        choices=["unified", "dual"],
        default="unified",
        help="Run as single unified API on port 8000, or dual services on 8001 & 8002"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=PORT,
        help=f"Port for unified mode (default: {PORT})"
    )
    args = parser.parse_args()

    if args.mode == "dual":
        run_dual_services()
    else:
        logger.info(f"Starting OpenLense Unified Backend on http://0.0.0.0:{args.port} (Docs: /docs)")
        uvicorn.run("main:app", host="0.0.0.0", port=args.port, reload=True)
