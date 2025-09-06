from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import asyncio
from app.config import settings
from app.services.redis_service import memory_service
from app.services.websocket_service import get_websocket_service
from app.services.broadcast_service import get_broadcast_service
from app.services.status_service import get_status_service
from app.config.websocket import get_websocket_settings

# Configure logging
logging.basicConfig(level=getattr(logging, settings.log_level))
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up AI PM Backend...")
    
    # Start Redis service
    try:
        await memory_service.connect()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Don't raise - allow app to start without Redis for development
    
    # Start WebSocket services
    websocket_settings = get_websocket_settings()
    if websocket_settings.enabled:
        try:
            websocket_service = get_websocket_service()
            await websocket_service.start()
            logger.info("WebSocket service started")
            
            broadcast_service = get_broadcast_service()
            await broadcast_service.start()
            logger.info("Broadcast service started")
            
            status_service = get_status_service()
            await status_service.start()
            logger.info("Status service started")
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket services: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI PM Backend...")
    
    # Stop WebSocket services
    if websocket_settings.enabled:
        try:
            websocket_service = get_websocket_service()
            await websocket_service.stop()
            
            broadcast_service = get_broadcast_service()
            await broadcast_service.stop()
            
            status_service = get_status_service()
            await status_service.stop()
            
            logger.info("WebSocket services stopped")
        except Exception as e:
            logger.error(f"Error stopping WebSocket services: {e}")
    
    # Stop Redis service
    try:
        await memory_service.close()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI app
app = FastAPI(
    title="AI Project Manager API",
    description="Backend API for AI Project Manager system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.api import health, projects, memory, chat, ai, websocket
app.include_router(health.router, prefix="/api")
app.include_router(projects.router, prefix="/api/projects")
app.include_router(memory.router, prefix="/api/memory")
app.include_router(chat.router)
app.include_router(ai.router)
app.include_router(websocket.router)

@app.get("/")
async def root():
    return {"message": "AI Project Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    redis_health = await memory_service.health_check()
    
    # Check WebSocket services health
    websocket_health = True
    websocket_settings = get_websocket_settings()
    if websocket_settings.enabled:
        try:
            status_service = get_status_service()
            health_summary = status_service.system_status.get_health_summary()
            websocket_health = health_summary["healthy"]
        except Exception as e:
            logger.error(f"Error checking WebSocket health: {e}")
            websocket_health = False
    
    overall_status = "healthy"
    if not redis_health or (websocket_settings.enabled and not websocket_health):
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "redis": "connected" if redis_health else "disconnected",
        "websocket": "healthy" if websocket_health else "unhealthy",
        "websocket_enabled": websocket_settings.enabled,
        "timestamp": "2024-01-01T00:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Check if WebSocket server should be started
    websocket_settings = get_websocket_settings()
    
    if websocket_settings.enabled and websocket_settings.separate_server:
        # Start WebSocket server in a separate process
        import multiprocessing
        import time
        
        def start_websocket_server():
            websocket_app = get_websocket_service().get_socketio_app()
            uvicorn.run(
                websocket_app,
                host=websocket_settings.host,
                port=websocket_settings.port,
                log_level=settings.log_level.lower()
            )
        
        # Start WebSocket server process
        websocket_process = multiprocessing.Process(target=start_websocket_server)
        websocket_process.start()
        logger.info(f"WebSocket server started on {websocket_settings.host}:{websocket_settings.port}")
        
        try:
            # Start main FastAPI server
            uvicorn.run(
                "app.main:app",
                host=settings.api_host,
                port=settings.api_port,
                reload=settings.environment == "development"
            )
        finally:
            # Stop WebSocket server
            websocket_process.terminate()
            websocket_process.join()
    else:
        # Start main FastAPI server only
        uvicorn.run(
            "app.main:app",
            host=settings.api_host,
            port=settings.api_port,
            reload=settings.environment == "development"
        )