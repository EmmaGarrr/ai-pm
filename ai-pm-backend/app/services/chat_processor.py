import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from .base_service import BaseService
from .gemini_service import GeminiService
from .context_engine import ContextEngine
from .websocket_service import get_websocket_service
from .status_service import get_status_service
from ..models.ai_response import (
    AIResponse, ChatMessage, ChatSession, ChatProcessingRequest, 
    ChatProcessingResponse, VerificationRequest, VerificationResponse
)
from ..events.websocket_events import WebSocketEvents
from ..utils.logger import get_logger

logger = get_logger(__name__)

class ChatProcessor(BaseService):
    """Chat processing pipeline with verification loop"""
    
    def __init__(self, gemini_service: GeminiService, context_engine: ContextEngine, redis_service):
        super().__init__()
        self.gemini_service = gemini_service
        self.context_engine = context_engine
        self.redis_service = redis_service
        self.confidence_threshold = 0.85
        self.verification_required = True
        
        # Get WebSocket and status services
        self.websocket_service = get_websocket_service()
        self.status_service = get_status_service()
    
    async def initialize(self) -> bool:
        """Initialize the chat processor"""
        try:
            await self.redis_service.connect()
            return True
        except Exception as e:
            self.log_error(f"Failed to initialize chat processor: {e}")
            return False
    
    async def health_check(self) -> bool:
        """Check if chat processor is healthy"""
        try:
            return await self.redis_service.health_check()
        except Exception as e:
            self.log_error(f"Chat processor health check failed: {e}")
            return False
        
    async def process_chat_message(self, request: ChatProcessingRequest) -> ChatProcessingResponse:
        """Process a chat message through the AI pipeline"""
        start_time = datetime.utcnow()
        
        try:
            # Emit processing start event
            await self._emit_processing_start(request)
            
            # Step 1: Analyze context
            await self._emit_context_analysis_start(request)
            context_analysis = await self.context_engine.analyze_context(
                request.project_id, 
                request.user_message,
                request.context
            )
            await self._emit_context_analysis_complete(request, context_analysis)
            
            # Step 2: Prepare context for AI
            ai_context = self._prepare_ai_context(context_analysis, request.context)
            
            # Step 3: Generate AI response
            await self._emit_ai_processing_start(request)
            ai_response = await self.gemini_service.generate_dual_output(
                request.user_message,
                ai_context
            )
            await self._emit_ai_processing_complete(request, ai_response)
            
            # Step 4: Determine if verification is needed
            verification_required = self._determine_verification_needed(ai_response, request.require_verification)
            
            # Step 5: Store message and response
            message_stored = await self._store_chat_interaction(request, ai_response, context_analysis)
            
            # Step 6: Generate verification prompt if needed
            verification_prompt = None
            if verification_required:
                verification_prompt = await self._generate_verification_prompt(request, ai_response)
                await self._emit_verification_required(request, verification_prompt)
            
            # Step 7: Update session if session_id provided
            session_updated = False
            if request.session_id:
                session_updated = await self._update_chat_session(request.session_id, request, ai_response)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Record processing time for status monitoring
            await self.status_service.record_response_time(processing_time)
            
            # Emit processing complete event
            await self._emit_processing_complete(request, ai_response, processing_time)
            
            return ChatProcessingResponse(
                success=True,
                ai_response=ai_response,
                verification_required=verification_required,
                verification_prompt=verification_prompt,
                session_updated=session_updated,
                message_stored=message_stored,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Record error for status monitoring
            await self.status_service.record_error()
            
            # Emit error event
            await self._emit_processing_error(request, str(e))
            
            return ChatProcessingResponse(
                success=False,
                error_message=str(e),
                processing_time=processing_time
            )
    
    def _prepare_ai_context(self, context_analysis, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context for AI generation"""
        ai_context = {
            'context_analysis': context_analysis.dict(),
            'relevant_memories': context_analysis.relevant_memories,
            'context_score': context_analysis.context_score,
            'completeness_score': context_analysis.completeness_score,
            'confidence_score': context_analysis.confidence_score,
            'suggested_actions': context_analysis.suggested_actions
        }
        
        # Add user-provided context
        if user_context:
            ai_context.update(user_context)
        
        return ai_context
    
    def _determine_verification_needed(self, ai_response: Dict[str, Any], require_verification: bool) -> bool:
        """Determine if verification is needed based on confidence and settings"""
        if not require_verification:
            return False
        
        if not self.verification_required:
            return False
        
        return ai_response.get('confidence', 1.0) < self.confidence_threshold
    
    async def _store_chat_interaction(self, request: ChatProcessingRequest, ai_response: Dict[str, Any], context_analysis) -> bool:
        """Store chat interaction in memory"""
        try:
            # Store user message
            user_message = ChatMessage(
                project_id=request.project_id,
                role="user",
                content=request.user_message,
                metadata={
                    'context_analysis': context_analysis.dict(),
                    'processing_timestamp': datetime.utcnow().isoformat()
                }
            )
            
            # Store AI response
            ai_message = ChatMessage(
                project_id=request.project_id,
                role="ai_pm",
                content=f"User Explanation: {ai_response.get('user_explanation', '')}\n\nTechnical Instruction: {ai_response.get('technical_instruction', '')}",
                ai_response=ai_response,
                metadata={
                    'confidence': ai_response.get('confidence', 0.5),
                    'processing_time': ai_response.get('metadata', {}).get('processing_time', 0),
                    'memory_keys': ai_response.get('metadata', {}).get('memory_keys', []),
                    'dependencies': ai_response.get('metadata', {}).get('dependencies', [])
                }
            )
            
            # Store both messages
            user_stored = await self._store_message(user_message)
            ai_stored = await self._store_message(ai_message)
            
            # Emit message stored events
            if user_stored:
                await self._emit_message_stored(user_message)
            if ai_stored:
                await self._emit_message_stored(ai_message)
            
            # Store context memories if suggested
            memory_keys = ai_response.get('metadata', {}).get('memory_keys', [])
            if memory_keys:
                for key in memory_keys:
                    memory_data = {
                        'type': 'context',
                        'key': key,
                        'value': {
                            'user_input': request.user_message,
                            'ai_response': ai_response,
                            'context_analysis': context_analysis.dict() if hasattr(context_analysis, 'dict') else context_analysis
                        },
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    stored = await self.context_engine.store_context_memory(request.project_id, memory_data)
                    if stored:
                        await self._emit_memory_stored(request.project_id, key, memory_data)
            
            return user_stored and ai_stored
            
        except Exception as e:
            logger.error(f"Error storing chat interaction: {e}")
            return False
    
    async def _store_message(self, message: ChatMessage) -> bool:
        """Store a single message in memory"""
        try:
            from ..models.memory import MemoryCreate, MessageType
            
            memory_key = f"message_{message.id}"
            memory_data = MemoryCreate(
                key=memory_key,
                value=message.dict(),
                type=MessageType.CONTEXT,  # Use CONTEXT instead of MESSAGE
                project_id=message.project_id
            )
            return await self.redis_service.store_memory(memory_data)
        except Exception as e:
            logger.error(f"Error storing message: {e}")
            return False
    
    async def _update_chat_session(self, session_id: str, request: ChatProcessingRequest, ai_response: AIResponse) -> bool:
        """Update chat session with new messages"""
        try:
            from ..models.memory import MemoryCreate, MemoryRecall, MessageType
            
            # Get existing session or create new one
            session_key = f"session_{session_id}"
            recall_data = MemoryRecall(
                project_id=request.project_id,
                query=session_key,
                memory_types=[MessageType.CONTEXT]  # Use CONTEXT instead of SESSION
            )
            
            existing_session = await self.redis_service.recall_memory(recall_data)
            
            if existing_session:
                session_data = existing_session[0]['value']
                session = ChatSession(**session_data)
            else:
                session = ChatSession(
                    id=session_id,
                    project_id=request.project_id,
                    title=request.user_message[:50] + "..." if len(request.user_message) > 50 else request.user_message
                )
            
            # Add messages to session
            user_message = ChatMessage(
                project_id=request.project_id,
                role="user",
                content=request.user_message
            )
            
            ai_message = ChatMessage(
                project_id=request.project_id,
                role="ai_pm",
                content=f"User Explanation: {ai_response.get('user_explanation', '')}\n\nTechnical Instruction: {ai_response.get('technical_instruction', '')}",
                ai_response=ai_response
            )
            
            session.messages.extend([user_message, ai_message])
            session.updated_at = datetime.utcnow()
            
            # Store updated session
            memory_data = MemoryCreate(
                key=session_key,
                value=session.dict(),
                type=MessageType.CONTEXT,  # Use CONTEXT instead of SESSION
                project_id=request.project_id
            )
            
            return await self.redis_service.store_memory(memory_data)
            
        except Exception as e:
            logger.error(f"Error updating chat session: {e}")
            return False
    
    async def _generate_verification_prompt(self, request: ChatProcessingRequest, ai_response: Dict[str, Any]) -> str:
        """Generate verification prompt for the AI response"""
        try:
            return await self.gemini_service.generate_verification_prompt(
                request.user_message,
                ai_response
            )
        except Exception as e:
            logger.error(f"Error generating verification prompt: {e}")
            return "Verification required but prompt generation failed."
    
    async def verify_response(self, verification_request: VerificationRequest) -> VerificationResponse:
        """Verify an AI response for accuracy and completeness"""
        try:
            # Emit verification start event
            await self._emit_verification_start(verification_request)
            
            # Analyze verification request
            verification_prompt = f"""
            Please verify the following solution for accuracy and completeness:
            
            Original Request: {verification_request.original_request}
            
            Proposed Solution:
            - User Explanation: {verification_request.proposed_solution.user_explanation}
            - Technical Instruction: {verification_request.proposed_solution.technical_instruction}
            - Confidence: {verification_request.proposed_solution.confidence}
            
            Context: {json.dumps(verification_request.context, indent=2)}
            
            Verification Intensity: {verification_request.verification_intensity}
            
            Please assess:
            1. Is the solution accurate and complete?
            2. Are there any missing requirements?
            3. Are the technical instructions actionable?
            4. Are all dependencies identified?
            5. What improvements are suggested?
            
            Respond with a JSON object containing:
            {{
                "verified": true/false,
                "confidence": 0.0-1.0,
                "feedback": "detailed feedback",
                "additional_requirements": ["req1", "req2"],
                "suggested_improvements": ["improvement1", "improvement2"]
            }}
            """
            
            # Generate verification response
            verification_response = await self.gemini_service.generate_with_retry(verification_prompt)
            
            # Parse and return verification result
            result = VerificationResponse(
                verified=verification_response.get('verified', False),
                confidence=verification_response.get('confidence', 0.0),
                feedback=verification_response.get('feedback', 'No feedback provided'),
                additional_requirements=verification_response.get('additional_requirements', []),
                suggested_improvements=verification_response.get('suggested_improvements', [])
            )
            
            # Emit verification complete event
            await self._emit_verification_complete(verification_request, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error verifying response: {e}")
            
            # Emit verification error event
            await self._emit_verification_error(verification_request, str(e))
            
            return VerificationResponse(
                verified=False,
                confidence=0.0,
                feedback=f"Verification failed: {str(e)}",
                additional_requirements=[],
                suggested_improvements=[]
            )
    
    async def get_chat_history(self, project_id: str, session_id: Optional[str] = None, limit: int = 50) -> List[ChatMessage]:
        """Get chat history for a project or session"""
        try:
            if session_id:
                # Get messages from specific session
                session_key = f"session_{session_id}"
                session_data = await self.redis_service.recall_memory(
                    project_id,
                    session_key,
                    ["session"]
                )
                
                if session_data:
                    session = ChatSession(**session_data[0]['value'])
                    return session.messages[-limit:]  # Return last N messages
                else:
                    return []
            else:
                # Get all messages for project
                all_memories = await self.redis_service.recall_memory(project_id, "", ["message"])
                
                # Convert to ChatMessage objects and sort by timestamp
                messages = []
                for memory in all_memories:
                    try:
                        message_data = memory['value']
                        if isinstance(message_data, dict):
                            message = ChatMessage(**message_data)
                            messages.append(message)
                    except Exception as e:
                        logger.error(f"Error parsing message from memory: {e}")
                        continue
                
                # Sort by timestamp and return last N messages
                messages.sort(key=lambda x: x.timestamp)
                return messages[-limit:]
                
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return []
    
    async def get_chat_sessions(self, project_id: str) -> List[ChatSession]:
        """Get all chat sessions for a project"""
        from datetime import datetime
        from ..models.memory import MemoryRecall, MessageType
        
        try:
            # Get all session memories
            recall_data = MemoryRecall(
                project_id=project_id,
                query="",
                memory_types=[MessageType.CONTEXT],
                limit=50
            )
            session_memories = await self.redis_service.recall_memory(recall_data)
            
            sessions = []
            for memory in session_memories:
                try:
                    # Only process memories that have session keys
                    if memory.get('key', '').startswith('session_'):
                        session_data = memory['value']
                        if isinstance(session_data, dict):
                            # Parse datetime strings back to datetime objects
                            if 'created_at' in session_data and isinstance(session_data['created_at'], str):
                                session_data['created_at'] = datetime.fromisoformat(session_data['created_at'])
                            if 'updated_at' in session_data and isinstance(session_data['updated_at'], str):
                                session_data['updated_at'] = datetime.fromisoformat(session_data['updated_at'])
                            
                            session = ChatSession(**session_data)
                            sessions.append(session)
                except Exception as e:
                    logger.error(f"Error parsing session from memory: {e}")
                    continue
            
            # Sort by creation date
            sessions.sort(key=lambda x: x.created_at, reverse=True)
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting chat sessions: {e}")
            return []
    
    async def delete_chat_session(self, project_id: str, session_id: str) -> bool:
        """Delete a chat session and its messages"""
        try:
            session_key = f"session_{session_id}"
            
            # Get session data to identify messages
            session_data = await self.redis_service.recall_memory(
                project_id,
                session_key,
                ["session"]
            )
            
            if session_data:
                session = ChatSession(**session_data[0]['value'])
                
                # Delete session
                await self.redis_service.delete_memory(project_id, session_key)
                
                # Delete individual messages
                for message in session.messages:
                    message_key = f"message_{message.id}"
                    await self.redis_service.delete_memory(project_id, message_key)
                
                logger.info(f"Deleted chat session {session_id} for project {project_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting chat session: {e}")
            return False
    
    async def get_processing_stats(self, project_id: str) -> Dict[str, Any]:
        """Get processing statistics for a project"""
        try:
            # Get all messages for the project
            all_messages = await self.get_chat_history(project_id)
            
            # Calculate statistics
            total_messages = len(all_messages)
            user_messages = len([m for m in all_messages if m.role == "user"])
            ai_messages = len([m for m in all_messages if m.role == "ai_pm"])
            
            # Calculate average confidence
            confidences = []
            processing_times = []
            
            for message in all_messages:
                if message.ai_response:
                    # Handle both dict and object cases
                    if isinstance(message.ai_response, dict):
                        confidences.append(message.ai_response.get('confidence', 0.5))
                        processing_times.append(message.ai_response.get('metadata', {}).get('processing_time', 0))
                    else:
                        confidences.append(message.ai_response.confidence)
                        processing_times.append(message.ai_response.metadata.processing_time)
            
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0.0
            
            # Get session count
            sessions = await self.get_chat_sessions(project_id)
            
            return {
                'project_id': project_id,
                'total_messages': total_messages,
                'user_messages': user_messages,
                'ai_messages': ai_messages,
                'total_sessions': len(sessions),
                'average_confidence': avg_confidence,
                'average_processing_time': avg_processing_time,
                'last_activity': all_messages[-1].timestamp if all_messages else None
            }
            
        except Exception as e:
            logger.error(f"Error getting processing stats: {e}")
            return {
                'project_id': project_id,
                'total_messages': 0,
                'user_messages': 0,
                'ai_messages': 0,
                'total_sessions': 0,
                'average_confidence': 0.0,
                'average_processing_time': 0.0,
                'last_activity': None
            }
    
    # WebSocket Event Emission Methods
    
    async def _emit_processing_start(self, request: ChatProcessingRequest):
        """Emit chat processing start event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_START,
                {
                    "request_id": getattr(request, 'id', 'unknown'),
                    "user_message": request.user_message,
                    "project_id": request.project_id,
                    "session_id": request.session_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting processing start event: {e}")
    
    async def _emit_context_analysis_start(self, request: ChatProcessingRequest):
        """Emit context analysis start event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "context_analysis",
                    "status": "started",
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting context analysis start event: {e}")
    
    async def _emit_context_analysis_complete(self, request: ChatProcessingRequest, context_analysis):
        """Emit context analysis complete event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "context_analysis",
                    "status": "completed",
                    "context_score": context_analysis.context_score,
                    "completeness_score": context_analysis.completeness_score,
                    "confidence_score": context_analysis.confidence_score,
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting context analysis complete event: {e}")
    
    async def _emit_ai_processing_start(self, request: ChatProcessingRequest):
        """Emit AI processing start event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "ai_generation",
                    "status": "started",
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting AI processing start event: {e}")
    
    async def _emit_ai_processing_complete(self, request: ChatProcessingRequest, ai_response: Dict[str, Any]):
        """Emit AI processing complete event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "ai_generation",
                    "status": "completed",
                    "confidence": ai_response.get('confidence', 0.5),
                    "processing_time": ai_response.get('metadata', {}).get('processing_time', 0),
                    "memory_keys": ai_response.get('metadata', {}).get('memory_keys', []),
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting AI processing complete event: {e}")
    
    async def _emit_verification_required(self, request: ChatProcessingRequest, verification_prompt: str):
        """Emit verification required event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "verification",
                    "status": "required",
                    "verification_prompt": verification_prompt,
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting verification required event: {e}")
    
    async def _emit_processing_complete(self, request: ChatProcessingRequest, ai_response: Dict[str, Any], processing_time: float):
        """Emit processing complete event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_END,
                {
                    "request_id": getattr(request, 'id', 'unknown'),
                    "success": True,
                    "confidence": ai_response.get('confidence', 0.5),
                    "processing_time": processing_time,
                    "verification_required": ai_response.get('confidence', 1.0) < self.confidence_threshold,
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting processing complete event: {e}")
    
    async def _emit_processing_error(self, request: ChatProcessingRequest, error_message: str):
        """Emit processing error event"""
        try:
            await self.websocket_service.broadcast_to_project(
                request.project_id,
                WebSocketEvents.AI_PROCESSING_ERROR,
                {
                    "request_id": getattr(request, 'id', 'unknown'),
                    "error": error_message,
                    "project_id": request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting processing error event: {e}")
    
    async def _emit_message_stored(self, message: ChatMessage):
        """Emit message stored event"""
        try:
            await self.websocket_service.broadcast_to_project(
                message.project_id,
                WebSocketEvents.MESSAGE_PROCESSED,
                {
                    "message_id": str(message.id),
                    "role": message.role,
                    "content_preview": message.content[:100] + "..." if len(message.content) > 100 else message.content,
                    "timestamp": message.timestamp.isoformat(),
                    "project_id": message.project_id
                }
            )
        except Exception as e:
            logger.error(f"Error emitting message stored event: {e}")
    
    async def _emit_memory_stored(self, project_id: str, memory_key: str, memory_data: Dict[str, Any]):
        """Emit memory stored event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.MEMORY_STORED,
                {
                    "memory_key": memory_key,
                    "memory_type": memory_data.get('type'),
                    "timestamp": memory_data.get('timestamp'),
                    "project_id": project_id
                }
            )
        except Exception as e:
            logger.error(f"Error emitting memory stored event: {e}")
    
    async def _emit_verification_start(self, verification_request: VerificationRequest):
        """Emit verification start event"""
        try:
            await self.websocket_service.broadcast_to_project(
                verification_request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "verification",
                    "status": "started",
                    "verification_intensity": verification_request.verification_intensity,
                    "project_id": verification_request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting verification start event: {e}")
    
    async def _emit_verification_complete(self, verification_request: VerificationRequest, result: VerificationResponse):
        """Emit verification complete event"""
        try:
            await self.websocket_service.broadcast_to_project(
                verification_request.project_id,
                WebSocketEvents.AI_PROCESSING_PROGRESS,
                {
                    "stage": "verification",
                    "status": "completed",
                    "verified": result.verified,
                    "confidence": result.confidence,
                    "feedback": result.feedback[:200] + "..." if len(result.feedback) > 200 else result.feedback,
                    "project_id": verification_request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting verification complete event: {e}")
    
    async def _emit_verification_error(self, verification_request: VerificationRequest, error_message: str):
        """Emit verification error event"""
        try:
            await self.websocket_service.broadcast_to_project(
                verification_request.project_id,
                WebSocketEvents.AI_PROCESSING_ERROR,
                {
                    "stage": "verification",
                    "error": error_message,
                    "project_id": verification_request.project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting verification error event: {e}")