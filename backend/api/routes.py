"""
OpenLense API Router Aggregator
==============================
Aggregates sub-routers for clean modular routing.
"""

from fastapi import APIRouter
from backend.auth.routes import router as auth_router

api_router = APIRouter()
api_router.include_router(auth_router)
