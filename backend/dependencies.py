"""
OpenLense API Dependencies
=========================
FastAPI dependency injection utilities for API key validation and request handling.
"""

import os
from fastapi import Header, HTTPException, status

def get_gemini_api_key(x_gemini_key: str = Header(None)) -> str:
    """Retrieve Gemini API key from header or environment."""
    key = x_gemini_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Gemini API key. Set GOOGLE_API_KEY environment variable or pass X-Gemini-Key header."
        )
    return key

def get_groq_api_key(x_groq_key: str = Header(None)) -> str:
    """Retrieve Groq API key from header or environment."""
    key = x_groq_key or os.getenv("GROQ_API_KEY")
    if not key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Groq API key. Set GROQ_API_KEY environment variable or pass X-Groq-Key header."
        )
    return key
