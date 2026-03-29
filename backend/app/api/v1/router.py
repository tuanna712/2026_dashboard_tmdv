from fastapi import APIRouter

from app.api.v1.endpoints import dashboard, reference

api_router = APIRouter()
api_router.include_router(reference.router, tags=["reference"])
api_router.include_router(dashboard.router, tags=["dashboard"])
