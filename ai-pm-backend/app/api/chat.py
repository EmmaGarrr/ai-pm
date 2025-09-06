from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from ..models.ai_response import (
    ChatProcessingRequest, ChatProcessingResponse, ChatMessage, 
    ChatSession, VerificationRequest, VerificationResponse, CreateSessionRequest
)
from ..models.memory import MemoryCreate, MessageType
from ..services.chat_processor import ChatProcessor
from ..services.redis_service import RedisService
from ..services.gemini_service import GeminiService
from ..services.context_engine import ContextEngine
from ..utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Dependency injection
async def get_chat_processor() -> ChatProcessor:
    """Get chat processor instance"""
    # These would normally be injected via dependency injection
    redis_service = RedisService()
    await redis_service.connect()
    
    gemini_config = {
        'api_key': 'your-gemini-api-key',  # This should come from config
        'model_name': 'gemini-2.0-flash-001',
        'temperature': 0.3,
        'max_tokens': 2000,
        'confidence_threshold': 0.85,
        'system_prompt_path': 'app/prompts/ai_pm_system.txt'
    }
    
    gemini_service = GeminiService(gemini_config)
    context_engine = ContextEngine(redis_service)
    chat_processor = ChatProcessor(gemini_service, context_engine, redis_service)
    
    return chat_processor

@router.post("/process", response_model=ChatProcessingResponse)
async def process_chat_message(
    request: ChatProcessingRequest,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Process a chat message through the AI pipeline"""
    try:
        logger.info(f"Processing chat message for project {request.project_id}")
        
        response = await processor.process_chat_message(request)
        
        if not response.success:
            raise HTTPException(status_code=500, detail=response.error_message)
        
        logger.info(f"Successfully processed chat message for project {request.project_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{project_id}", response_model=List[ChatMessage])
async def get_chat_history(
    project_id: str,
    session_id: Optional[str] = None,
    limit: int = 50,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Get chat history for a project or session"""
    try:
        logger.info(f"Getting chat history for project {project_id}")
        
        history = await processor.get_chat_history(project_id, session_id, limit)
        
        logger.info(f"Retrieved {len(history)} messages for project {project_id}")
        return history
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{project_id}", response_model=List[ChatSession])
async def get_chat_sessions(
    project_id: str,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Get all chat sessions for a project"""
    try:
        logger.info(f"Getting chat sessions for project {project_id}")
        
        sessions = await processor.get_chat_sessions(project_id)
        
        logger.info(f"Retrieved {len(sessions)} sessions for project {project_id}")
        return sessions
        
    except Exception as e:
        logger.error(f"Error getting chat sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{project_id}/{session_id}")
async def delete_chat_session(
    project_id: str,
    session_id: str,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Delete a chat session and its messages"""
    try:
        logger.info(f"Deleting chat session {session_id} for project {project_id}")
        
        success = await processor.delete_chat_session(project_id, session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Successfully deleted chat session {session_id} for project {project_id}")
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify", response_model=VerificationResponse)
async def verify_response(
    request: VerificationRequest,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Verify an AI response for accuracy and completeness"""
    try:
        logger.info("Verifying AI response")
        
        verification_result = await processor.verify_response(request)
        
        logger.info(f"Verification completed: {verification_result.verified}")
        return verification_result
        
    except Exception as e:
        logger.error(f"Error verifying response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{project_id}")
async def get_processing_stats(
    project_id: str,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Get processing statistics for a project"""
    try:
        logger.info(f"Getting processing stats for project {project_id}")
        
        stats = await processor.get_processing_stats(project_id)
        
        logger.info(f"Retrieved stats for project {project_id}")
        return stats
        
    except Exception as e:
        logger.error(f"Error getting processing stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{project_id}")
async def get_chat_status(
    project_id: str,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Get chat processing status for a project"""
    try:
        logger.info(f"Getting chat status for project {project_id}")
        
        # Get basic stats
        stats = await processor.get_processing_stats(project_id)
        
        # Get recent sessions
        sessions = await processor.get_chat_sessions(project_id)
        
        # Get recent messages
        recent_messages = await processor.get_chat_history(project_id, limit=10)
        
        status = {
            "project_id": project_id,
            "is_active": len(recent_messages) > 0,
            "total_sessions": len(sessions),
            "total_messages": stats["total_messages"],
            "average_confidence": stats["average_confidence"],
            "last_activity": stats["last_activity"],
            "recent_sessions": len([s for s in sessions if (s.updated_at - s.created_at).total_seconds() < 3600]),  # Sessions active in last hour
            "processing_healthy": stats["average_processing_time"] < 5.0  # Processing time under 5 seconds
        }
        
        logger.info(f"Retrieved chat status for project {project_id}")
        return status
        
    except Exception as e:
        logger.error(f"Error getting chat status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{project_id}")
async def create_chat_session(
    project_id: str,
    session_data: CreateSessionRequest,
):
    """Create a new chat session for a project"""
    try:
        logger.info(f"Creating new chat session for project {project_id}")
        
        # Generate session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        # Create session with data from request
        session = ChatSession(
            id=session_id,
            project_id=project_id,
            title=session_data.title,
            messages=[],
            metadata={
                "description": session_data.description,
                "settings": session_data.settings or {
                    "autoSave": True,
                    "memoryContext": True,
                    "aiAssistance": True,
                    "allowInvites": False,
                    "isPublic": False,
                }
            }
        )
        
        # Store session with consistent key pattern
        redis_service = RedisService()
        await redis_service.connect()
        
        # Convert session to dict and handle datetime serialization
        session_dict = session.dict()
        session_dict['created_at'] = session_dict['created_at'].isoformat()
        session_dict['updated_at'] = session_dict['updated_at'].isoformat()
        
        memory_data = MemoryCreate(
            project_id=project_id,
            key=f"session_{session_id}",
            value=session_dict,
            type=MessageType.CONTEXT
        )
        
        success = await redis_service.store_memory(memory_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        logger.info(f"Successfully created chat session {session_id} for project {project_id}")
        return {
            "session_id": session_id,
            "title": session_data.title,
            "description": session_data.description,
            "created_at": session.created_at,
            "project_id": project_id,
            "message": "Session created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/{project_id}")
async def get_project_context(
    project_id: str,
    processor: ChatProcessor = Depends(get_chat_processor)
):
    """Get project context information"""
    try:
        logger.info(f"Getting project context for {project_id}")
        
        # Get context summary from context engine
        context_summary = await processor.context_engine.get_project_context_summary(project_id)
        
        # Get recent activities
        recent_messages = await processor.get_chat_history(project_id, limit=5)
        
        # Enhance context with recent activities
        context_summary['recent_activities'] = [
            {
                'timestamp': msg.timestamp,
                'role': msg.role,
                'content_preview': msg.content[:100] + '...' if len(msg.content) > 100 else msg.content
            }
            for msg in recent_messages
        ]
        
        logger.info(f"Retrieved project context for {project_id}")
        return context_summary
        
    except Exception as e:
        logger.error(f"Error getting project context: {e}")
        raise HTTPException(status_code=500, detail=str(e))