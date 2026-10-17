"""
OpenLense Authentication Routes
==============================
Login and session status endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from backend.auth.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Authenticate user and return a JWT access token."""
    # In development, accept valid user credentials
    if not credentials.username or not credentials.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )
    
    token = create_access_token({"sub": credentials.username})
    return {"access_token": token, "token_type": "bearer"}
