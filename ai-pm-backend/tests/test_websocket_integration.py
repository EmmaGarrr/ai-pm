import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.chat_processor import ChatProcessor
from app.services.context_engine import ContextEngine
from app.services.gemini_service import GeminiService
from app.services.redis_service import RedisService
from app.models.ai_response import ChatProcessingRequest, AIResponse, ContextAnalysis
from app.events.websocket_events import WebSocketEvents

class TestChatProcessorWebSocketIntegration:
    """Test WebSocket integration in chat processor"""
    
    @pytest.fixture
    def mock_services(self):
        """Create mock services for testing"""
        gemini_service = Mock(spec=GeminiService)
        context_engine = Mock(spec=ContextEngine)
        redis_service = Mock(spec=RedisService)
        
        # Configure mock responses
        context_analysis = ContextAnalysis(
            project_id="test_project",
            relevant_memories=[],
            context_score=0.8,
            completeness_score=0.7,
            confidence_score=0.75,
            suggested_actions=["Test action"],
            timestamp=datetime.utcnow()
        )
        
        ai_response = AIResponse(
            user_explanation="Test explanation",
            technical_instruction="Test instruction",
            confidence=0.85,
            metadata={"processing_time": 1.5, "memory_keys": ["test_key"]}
        )
        
        context_engine.analyze_context.return_value = context_analysis
        gemini_service.generate_dual_output.return_value = ai_response
        redis_service.store_memory.return_value = True
        redis_service.recall_memory.return_value = []
        
        return {
            "gemini_service": gemini_service,
            "context_engine": context_engine,
            "redis_service": redis_service
        }
    
    @pytest.fixture
    def chat_processor(self, mock_services):
        """Create chat processor with mocked services"""
        with patch('app.services.chat_processor.get_websocket_service') as mock_websocket, \
             patch('app.services.chat_processor.get_status_service') as mock_status:
            
            processor = ChatProcessor(
                gemini_service=mock_services["gemini_service"],
                context_engine=mock_services["context_engine"],
                redis_service=mock_services["redis_service"]
            )
            
            # Mock WebSocket and status services
            processor.websocket_service = Mock()
            processor.status_service = Mock()
            
            return processor
    
    @pytest.mark.asyncio
    async def test_processing_start_event(self, chat_processor):
        """Test processing start event emission"""
        request = ChatProcessingRequest(
            project_id="test_project",
            user_message="Test message",
            context={},
            require_verification=False
        )
        
        await chat_processor.process_chat_message(request)
        
        # Check if processing start event was emitted
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_START,
            {
                "request_id": "unknown",
                "user_message": "Test message",
                "project_id": "test_project",
                "session_id": None,
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
    
    @pytest.mark.asyncio
    async def test_context_analysis_events(self, chat_processor):
        """Test context analysis event emissions"""
        request = ChatProcessingRequest(
            project_id="test_project",
            user_message="Test message",
            context={},
            require_verification=False
        )
        
        await chat_processor.process_chat_message(request)
        
        # Check if context analysis events were emitted
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_PROGRESS,
            {
                "stage": "context_analysis",
                "status": "started",
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
        
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_PROGRESS,
            {
                "stage": "context_analysis",
                "status": "completed",
                "context_score": 0.8,
                "completeness_score": 0.7,
                "confidence_score": 0.75,
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
    
    @pytest.mark.asyncio
    async def test_ai_processing_events(self, chat_processor):
        """Test AI processing event emissions"""
        request = ChatProcessingRequest(
            project_id="test_project",
            user_message="Test message",
            context={},
            require_verification=False
        )
        
        await chat_processor.process_chat_message(request)
        
        # Check if AI processing events were emitted
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_PROGRESS,
            {
                "stage": "ai_generation",
                "status": "started",
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
        
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_PROGRESS,
            {
                "stage": "ai_generation",
                "status": "completed",
                "confidence": 0.85,
                "processing_time": 1.5,
                "memory_keys": ["test_key"],
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
    
    @pytest.mark.asyncio
    async def test_processing_complete_event(self, chat_processor):
        """Test processing complete event emission"""
        request = ChatProcessingRequest(
            project_id="test_project",
            user_message="Test message",
            context={},
            require_verification=False
        )
        
        await chat_processor.process_chat_message(request)
        
        # Check if processing complete event was emitted
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_END,
            {
                "request_id": "unknown",
                "success": True,
                "confidence": 0.85,
                "processing_time": pytest.approx(1.5, rel=0.1),
                "verification_required": False,
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
    
    @pytest.mark.asyncio
    async def test_error_handling_events(self, chat_processor):
        """Test error handling event emissions"""
        # Configure mock to raise an error
        chat_processor.context_engine.analyze_context.side_effect = Exception("Test error")
        
        request = ChatProcessingRequest(
            project_id="test_project",
            user_message="Test message",
            context={},
            require_verification=False
        )
        
        await chat_processor.process_chat_message(request)
        
        # Check if error event was emitted
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_ERROR,
            {
                "request_id": "unknown",
                "error": "Test error",
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
        
        # Check if error was recorded
        chat_processor.status_service.record_error.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_verification_events(self, chat_processor):
        """Test verification event emissions"""
        # Configure mock to require verification
        ai_response = AIResponse(
            user_explanation="Test explanation",
            technical_instruction="Test instruction",
            confidence=0.7,  # Low confidence to trigger verification
            metadata={"processing_time": 1.5, "memory_keys": ["test_key"]}
        )
        chat_processor.gemini_service.generate_dual_output.return_value = ai_response
        
        request = ChatProcessingRequest(
            project_id="test_project",
            user_message="Test message",
            context={},
            require_verification=True
        )
        
        await chat_processor.process_chat_message(request)
        
        # Check if verification required event was emitted
        chat_processor.websocket_service.broadcast_to_project.assert_any_call(
            "test_project",
            WebSocketEvents.AI_PROCESSING_PROGRESS,
            {
                "stage": "verification",
                "status": "required",
                "verification_prompt": "Verification required but prompt generation failed.",
                "project_id": "test_project",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )

class TestContextEngineWebSocketIntegration:
    """Test WebSocket integration in context engine"""
    
    @pytest.fixture
    def mock_redis_service(self):
        """Create mock Redis service"""
        redis_service = Mock(spec=RedisService)
        redis_service.recall_memory.return_value = []
        redis_service.store_memory.return_value = True
        return redis_service
    
    @pytest.fixture
    def context_engine(self, mock_redis_service):
        """Create context engine with mocked services"""
        with patch('app.services.context_engine.get_websocket_service') as mock_websocket, \
             patch('app.services.context_engine.get_status_service') as mock_status:
            
            engine = ContextEngine(redis_service=mock_redis_service)
            
            # Mock WebSocket and status services
            engine.websocket_service = Mock()
            engine.status_service = Mock()
            
            return engine
    
    @pytest.mark.asyncio
    async def test_context_analysis_events(self, context_engine):
        """Test context analysis event emissions"""
        project_id = "test_project"
        user_input = "Test user input"
        
        await context_engine.analyze_context(project_id, user_input)
        
        # Check if context analysis start event was emitted
        context_engine.websocket_service.broadcast_to_project.assert_any_call(
            project_id,
            WebSocketEvents.CONTEXT_ANALYSIS_COMPLETE,
            {
                "stage": "analysis_started",
                "project_id": project_id,
                "user_input_preview": "Test user input",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
        
        # Check if key terms extracted event was emitted
        context_engine.websocket_service.broadcast_to_project.assert_any_call(
            project_id,
            WebSocketEvents.CONTEXT_ANALYSIS_COMPLETE,
            {
                "stage": "key_terms_extracted",
                "project_id": project_id,
                "key_terms": pytest.approx(["test", "user", "input"], rel=1e-9),
                "term_count": pytest.approx(3, rel=1e-9),
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
    
    @pytest.mark.asyncio
    async def test_memory_stored_event(self, context_engine):
        """Test memory stored event emission"""
        project_id = "test_project"
        memory_data = {
            "type": "context",
            "key": "test_key",
            "value": {"test": "data"}
        }
        
        await context_engine.store_context_memory(project_id, memory_data)
        
        # Check if memory stored event was emitted
        context_engine.websocket_service.broadcast_to_project.assert_called_once_with(
            project_id,
            WebSocketEvents.MEMORY_STORED,
            {
                "memory_key": pytest.approx(f"context_context_{datetime.utcnow().timestamp()}", rel=1e-9),
                "memory_type": "context",
                "project_id": project_id,
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9),
                "relevance_score": 1.0
            }
        )
    
    @pytest.mark.asyncio
    async def test_similar_issues_events(self, context_engine):
        """Test similar issues search event emissions"""
        project_id = "test_project"
        issue_description = "Test issue description"
        
        await context_engine.find_similar_issues(project_id, issue_description)
        
        # Check if similar issues search start event was emitted
        context_engine.websocket_service.broadcast_to_project.assert_any_call(
            project_id,
            WebSocketEvents.SIMILAR_ISSUES_FOUND,
            {
                "stage": "search_started",
                "project_id": project_id,
                "issue_description": "Test issue description",
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
        
        # Check if similar issues found event was emitted
        context_engine.websocket_service.broadcast_to_project.assert_any_call(
            project_id,
            WebSocketEvents.SIMILAR_ISSUES_FOUND,
            {
                "stage": "search_complete",
                "project_id": project_id,
                "issue_description": "Test issue description",
                "similar_issues_count": 0,
                "top_issue_types": [],
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
    
    @pytest.mark.asyncio
    async def test_context_analysis_error_event(self, context_engine):
        """Test context analysis error event emission"""
        # Configure mock to raise an error
        context_engine.redis_service.recall_memory.side_effect = Exception("Test error")
        
        project_id = "test_project"
        user_input = "Test user input"
        
        await context_engine.analyze_context(project_id, user_input)
        
        # Check if error event was emitted
        context_engine.websocket_service.broadcast_to_project.assert_any_call(
            project_id,
            WebSocketEvents.ERROR_OCCURRED,
            {
                "component": "context_engine",
                "operation": "context_analysis",
                "error": "Test error",
                "project_id": project_id,
                "timestamp": pytest.approx(datetime.utcnow().isoformat(), rel=1e-9)
            }
        )
        
        # Check if error was recorded
        context_engine.status_service.record_error.assert_called_once()

class TestWebSocketEventFlow:
    """Test complete WebSocket event flow"""
    
    @pytest.mark.asyncio
    async def test_complete_chat_processing_event_flow(self):
        """Test complete event flow for chat processing"""
        with patch('app.services.chat_processor.get_websocket_service') as mock_websocket, \
             patch('app.services.chat_processor.get_status_service') as mock_status, \
             patch('app.services.chat_processor.GeminiService') as mock_gemini, \
             patch('app.services.chat_processor.ContextEngine') as mock_context, \
             patch('app.services.chat_processor.RedisService') as mock_redis:
            
            # Configure mocks
            websocket_service = Mock()
            status_service = Mock()
            gemini_service = Mock()
            context_engine = Mock()
            redis_service = Mock()
            
            mock_websocket.return_value = websocket_service
            mock_status.return_value = status_service
            mock_gemini.return_value = gemini_service
            mock_context.return_value = context_engine
            mock_redis.return_value = redis_service
            
            # Configure mock responses
            from app.models.ai_response import ContextAnalysis, AIResponse
            
            context_analysis = ContextAnalysis(
                project_id="test_project",
                relevant_memories=[],
                context_score=0.8,
                completeness_score=0.7,
                confidence_score=0.75,
                suggested_actions=["Test action"],
                timestamp=datetime.utcnow()
            )
            
            ai_response = AIResponse(
                user_explanation="Test explanation",
                technical_instruction="Test instruction",
                confidence=0.85,
                metadata={"processing_time": 1.5, "memory_keys": ["test_key"]}
            )
            
            context_engine.analyze_context.return_value = context_analysis
            gemini_service.generate_dual_output.return_value = ai_response
            redis_service.store_memory.return_value = True
            redis_service.recall_memory.return_value = []
            
            # Create chat processor
            from app.services.chat_processor import ChatProcessor
            processor = ChatProcessor(gemini_service, context_engine, redis_service)
            
            # Process chat message
            from app.models.ai_response import ChatProcessingRequest
            request = ChatProcessingRequest(
                project_id="test_project",
                user_message="Test message",
                context={},
                require_verification=False
            )
            
            await processor.process_chat_message(request)
            
            # Verify event sequence
            expected_events = [
                WebSocketEvents.AI_PROCESSING_START,
                WebSocketEvents.AI_PROCESSING_PROGRESS,  # context_analysis started
                WebSocketEvents.AI_PROCESSING_PROGRESS,  # context_analysis completed
                WebSocketEvents.AI_PROCESSING_PROGRESS,  # ai_generation started
                WebSocketEvents.AI_PROCESSING_PROGRESS,  # ai_generation completed
                WebSocketEvents.AI_PROCESSING_END
            ]
            
            # Check that all expected events were called
            actual_calls = [call[0][1] for call in websocket_service.broadcast_to_project.call_args_list]
            
            for expected_event in expected_events:
                assert any(expected_event in call for call in actual_calls), f"Event {expected_event} not found in calls: {actual_calls}"
            
            # Check that processing time was recorded
            status_service.record_response_time.assert_called_once()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])