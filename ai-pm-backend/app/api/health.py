from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.redis_service import memory_service

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint"""
    try:
        redis_health = await memory_service.health_check()
        return {
            "status": "healthy" if redis_health else "degraded",
            "redis": "connected" if redis_health else "disconnected",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@router.get("/health/redis")
async def redis_health_check() -> Dict[str, Any]:
    """Redis-specific health check"""
    try:
        is_healthy = await memory_service.health_check()
        return {
            "redis": "connected" if is_healthy else "disconnected",
            "status": "healthy" if is_healthy else "unhealthy"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Redis connection failed: {str(e)}")

@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness check endpoint"""
    try:
        redis_ready = await memory_service.health_check()
        return {
            "ready": redis_ready,
            "components": {
                "redis": "ready" if redis_ready else "not ready"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")

@router.get("/metrics")
async def basic_metrics() -> Dict[str, Any]:
    """Basic application metrics"""
    try:
        # This is a simple metrics endpoint - can be expanded later
        return {
            "version": "1.0.0",
            "status": "running",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")