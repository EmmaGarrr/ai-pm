import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.websocket_service import WebSocketService, ConnectionManager, ConnectionInfo
from app.services.broadcast_service import BroadcastService, BroadcastMessage
from app.services.status_service import StatusService, SystemStatus
from app.events.websocket_events import WebSocketEvents, EventManager, WebSocketEvent
from app.utils.error_handler import ErrorHandler, ErrorSeverity, ErrorCategory
from app.utils.websocket_security import WebSocketAuthenticator, WebSocketSecurityMiddleware

class TestWebSocketService:
    """Test cases for WebSocket service"""
    
    @pytest.fixture
    def websocket_service(self):
        """Create WebSocket service instance for testing"""
        return WebSocketService()
    
    @pytest.fixture
    def connection_manager(self):
        """Create connection manager instance for testing"""
        return ConnectionManager(max_connections=100, connection_timeout=300)
    
    @pytest.mark.asyncio
    async def test_connection_lifecycle(self, connection_manager):
        """Test connection lifecycle"""
        # Test adding connection
        connection_id = "test_conn_1"
        sid = "test_sid_1"
        ip_address = "192.168.1.1"
        user_agent = "test-agent"
        
        success = await connection_manager.add_connection(connection_id, sid, ip_address, user_agent)
        assert success is True
        
        # Test getting connection
        connection_info = connection_manager.get_connection(connection_id)
        assert connection_info is not None
        assert connection_info.connection_id == connection_id
        assert connection_info.sid == sid
        assert connection_info.ip_address == ip_address
        
        # Test removing connection
        success = await connection_manager.remove_connection(connection_id)
        assert success is True
        
        # Verify connection is removed
        connection_info = connection_manager.get_connection(connection_id)
        assert connection_info is None
    
    @pytest.mark.asyncio
    async def test_connection_limit(self, connection_manager):
        """Test connection limit enforcement"""
        # Set low limit for testing
        connection_manager.max_connections = 2
        
        # Add connections up to limit
        await connection_manager.add_connection("conn_1", "sid_1", "192.168.1.1", "agent1")
        await connection_manager.add_connection("conn_2", "sid_2", "192.168.1.2", "agent2")
        
        # Try to add one more connection
        success = await connection_manager.add_connection("conn_3", "sid_3", "192.168.1.3", "agent3")
        assert success is False  # Should be rejected
    
    @pytest.mark.asyncio
    async def test_project_rooms(self, connection_manager):
        """Test project room functionality"""
        # Add connection
        connection_id = "test_conn_1"
        sid = "test_sid_1"
        await connection_manager.add_connection(connection_id, sid, "192.168.1.1", "test-agent")
        
        # Join project
        project_id = "test_project_1"
        success = await connection_manager.join_project(connection_id, project_id)
        assert success is True
        
        # Verify connection is in project
        project_connections = connection_manager.get_project_connections(project_id)
        assert len(project_connections) == 1
        assert project_connections[0].connection_id == connection_id
        
        # Leave project
        success = await connection_manager.leave_project(connection_id, project_id)
        assert success is True
        
        # Verify connection is no longer in project
        project_connections = connection_manager.get_project_connections(project_id)
        assert len(project_connections) == 0
    
    @pytest.mark.asyncio
    async def test_authentication(self, connection_manager):
        """Test connection authentication"""
        # Add connection
        connection_id = "test_conn_1"
        sid = "test_sid_1"
        await connection_manager.add_connection(connection_id, sid, "192.168.1.1", "test-agent")
        
        # Authenticate connection
        user_id = "test_user_1"
        success = await connection_manager.authenticate_connection(connection_id, user_id)
        assert success is True
        
        # Verify authentication
        connection_info = connection_manager.get_connection(connection_id)
        assert connection_info.is_authenticated is True
        assert connection_info.user_id == user_id
        
        # Test user connections
        user_connections = connection_manager.get_user_connections(user_id)
        assert len(user_connections) == 1
        assert user_connections[0].connection_id == connection_id
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, connection_manager):
        """Test rate limiting functionality"""
        # Add connection
        connection_id = "test_conn_1"
        sid = "test_sid_1"
        await connection_manager.add_connection(connection_id, sid, "192.168.1.1", "test-agent")
        
        # Set low rate limit for testing
        connection_manager.rate_limit_messages = 3
        
        # Test rate limiting
        for i in range(5):
            can_send = await connection_manager.check_rate_limit(connection_id)
            if i < 3:
                assert can_send is True
            else:
                assert can_send is False

class TestBroadcastService:
    """Test cases for broadcast service"""
    
    @pytest.fixture
    def broadcast_service(self):
        """Create broadcast service instance for testing"""
        return BroadcastService(max_queue_size=10, max_retries=3)
    
    @pytest.mark.asyncio
    async def test_broadcast_message_creation(self, broadcast_service):
        """Test broadcast message creation"""
        message_id = "test_msg_1"
        event_type = "test_event"
        data = {"test": "data"}
        target_type = "project"
        target_ids = ["project_1", "project_2"]
        
        message = BroadcastMessage(
            message_id=message_id,
            event_type=event_type,
            data=data,
            target_type=target_type,
            target_ids=target_ids,
            priority=2
        )
        
        assert message.message_id == message_id
        assert message.event_type == event_type
        assert message.data == data
        assert message.target_type == target_type
        assert message.target_ids == target_ids
        assert message.priority == 2
        assert message.attempts == 0
        assert message.should_retry() is True
    
    @pytest.mark.asyncio
    async def test_broadcast_priority_queues(self, broadcast_service):
        """Test broadcast priority queues"""
        # Create messages with different priorities
        high_priority_msg = BroadcastMessage(
            "high_1", "event", {"data": "high"}, "system", ["all"], priority=3
        )
        normal_priority_msg = BroadcastMessage(
            "normal_1", "event", {"data": "normal"}, "system", ["all"], priority=2
        )
        low_priority_msg = BroadcastMessage(
            "low_1", "event", {"data": "low"}, "system", ["all"], priority=1
        )
        
        # Add messages to queues
        broadcast_service._add_to_queue(high_priority_msg)
        broadcast_service._add_to_queue(normal_priority_msg)
        broadcast_service._add_to_queue(low_priority_msg)
        
        # Check queue sizes
        assert len(broadcast_service.high_priority_queue) == 1
        assert len(broadcast_service.normal_priority_queue) == 1
        assert len(broadcast_service.low_priority_queue) == 1
    
    @pytest.mark.asyncio
    async def test_broadcast_retry_logic(self, broadcast_service):
        """Test broadcast retry logic"""
        message = BroadcastMessage(
            "retry_test", "event", {"data": "test"}, "system", ["all"]
        )
        
        # Test retry logic
        assert message.should_retry() is True
        
        # Simulate failed attempts
        message.attempts = 1
        retry_delay = message.get_retry_delay()
        assert retry_delay == 1.0  # Initial delay
        
        message.attempts = 2
        retry_delay = message.get_retry_delay()
        assert retry_delay == 2.0  # Exponential backoff
        
        # Test max attempts
        message.attempts = message.max_attempts
        assert message.should_retry() is False

class TestStatusService:
    """Test cases for status service"""
    
    @pytest.fixture
    def status_service(self):
        """Create status service instance for testing"""
        return StatusService(check_interval=30)
    
    @pytest.mark.asyncio
    async def test_system_status_creation(self, status_service):
        """Test system status creation"""
        system_status = status_service.system_status
        
        assert system_status.healthy is True
        assert len(system_status.components) > 0
        assert "redis" in system_status.components
        assert "websocket" in system_status.components
        assert "ai_service" in system_status.components
    
    @pytest.mark.asyncio
    async def test_component_status_update(self, status_service):
        """Test component status updates"""
        # Update component status
        status_service.system_status.update_component_status("redis", False)
        
        # Check status update
        assert status_service.system_status.components["redis"] is False
        
        # Check health summary
        health_summary = status_service.system_status.get_health_summary()
        assert health_summary["healthy"] is False
        assert health_summary["healthy_components"] < health_summary["total_components"]
    
    @pytest.mark.asyncio
    async def test_alert_management(self, status_service):
        """Test alert management"""
        # Add alert
        alert_data = {
            "type": "test_alert",
            "component": "redis",
            "message": "Test alert message",
            "severity": "high"
        }
        
        status_service.system_status.add_alert(alert_data)
        
        # Check alert was added
        assert len(status_service.system_status.alerts) == 1
        assert status_service.system_status.alerts[0]["type"] == "test_alert"
        
        # Test alert filtering
        alerts = status_service.get_alerts(severity="high")
        assert len(alerts) == 1
        
        alerts = status_service.get_alerts(severity="low")
        assert len(alerts) == 0
    
    @pytest.mark.asyncio
    async def test_threshold_checking(self, status_service):
        """Test threshold checking"""
        # Add some response times
        status_service.response_times.extend([15.0, 16.0, 17.0])  # Critical threshold
        
        # Check thresholds
        await status_service._check_thresholds()
        
        # Check if alert was generated
        critical_alerts = [a for a in status_service.system_status.alerts if a.get("severity") == "critical"]
        assert len(critical_alerts) > 0

class TestEventManager:
    """Test cases for event manager"""
    
    @pytest.fixture
    def event_manager(self):
        """Create event manager instance for testing"""
        return EventManager()
    
    @pytest.mark.asyncio
    async def test_event_creation(self, event_manager):
        """Test event creation"""
        event = event_manager.create_event(
            event_type="test_event",
            data={"message": "test data"},
            project_id="test_project",
            user_id="test_user"
        )
        
        assert event.event_type == "test_event"
        assert event.data == {"message": "test data"}
        assert event.project_id == "test_project"
        assert event.user_id == "test_user"
        assert event.timestamp is not None
    
    @pytest.mark.asyncio
    async def test_event_serialization(self, event_manager):
        """Test event serialization"""
        event = event_manager.create_event(
            event_type="test_event",
            data={"message": "test data"}
        )
        
        # Test to_dict
        event_dict = event.to_dict()
        assert event_dict["event_type"] == "test_event"
        assert event_dict["data"] == {"message": "test data"}
        
        # Test to_json
        event_json = event.to_json()
        assert isinstance(event_json, str)
        
        # Test from_json
        parsed_event = WebSocketEvent.from_json(event_json)
        assert parsed_event.event_type == event.event_type
        assert parsed_event.data == event.data
    
    @pytest.mark.asyncio
    async def test_event_history(self, event_manager):
        """Test event history management"""
        # Create and add events
        for i in range(5):
            event = event_manager.create_event(
                event_type=f"event_{i}",
                data={"index": i}
            )
            event_manager.add_to_history(event)
        
        # Check history
        history = event_manager.get_event_history(limit=3)
        assert len(history) == 3
        
        # Check filtering
        filtered_history = event_manager.get_event_history(event_type="event_1")
        assert len(filtered_history) == 1
        assert filtered_history[0].event_type == "event_1"

class TestErrorHandler:
    """Test cases for error handler"""
    
    @pytest.fixture
    def error_handler(self):
        """Create error handler instance for testing"""
        return ErrorHandler()
    
    @pytest.mark.asyncio
    async def test_error_handling(self, error_handler):
        """Test error handling"""
        # Create test error
        test_error = Exception("Test error")
        
        # Handle error
        error_info = await error_handler.handle_error(
            error=test_error,
            category=ErrorCategory.WEBSOCKET,
            severity=ErrorSeverity.HIGH,
            context={"test": "context"}
        )
        
        # Check error info
        assert error_info.message == "Test error"
        assert error_info.category == ErrorCategory.WEBSOCKET
        assert error_info.severity == ErrorSeverity.HIGH
        assert error_info.details == {"test": "context"}
        assert error_info.error_id is not None
    
    @pytest.mark.asyncio
    async def test_circuit_breaker(self, error_handler):
        """Test circuit breaker functionality"""
        circuit_breaker = error_handler.circuit_breakers.get("ai_service")
        
        # Test initial state
        assert circuit_breaker.state.value == "closed"
        
        # Test failure handling
        for i in range(circuit_breaker.failure_threshold):
            circuit_breaker._on_failure()
        
        # Check if circuit breaker opened
        assert circuit_breaker.state.value == "open"
        
        # Test state recovery
        circuit_breaker._should_attempt_reset = Mock(return_value=True)
        circuit_breaker.state = circuit_breaker.HALF_OPEN
        circuit_breaker._on_success()
        assert circuit_breaker.state.value == "closed"
    
    @pytest.mark.asyncio
    async def test_error_statistics(self, error_handler):
        """Test error statistics"""
        # Add some errors
        for i in range(3):
            await error_handler.handle_error(
                error=Exception(f"Test error {i}"),
                category=ErrorCategory.WEBSOCKET,
                severity=ErrorSeverity.HIGH
            )
        
        # Get statistics
        stats = error_handler.get_error_statistics(hours=1)
        
        assert stats["total_errors"] == 3
        assert "websocket" in stats["category_distribution"]
        assert stats["category_distribution"]["websocket"] == 3
        assert "high" in stats["severity_distribution"]

class TestWebSocketSecurity:
    """Test cases for WebSocket security"""
    
    @pytest.fixture
    def authenticator(self):
        """Create authenticator instance for testing"""
        return WebSocketAuthenticator()
    
    @pytest.mark.asyncio
    async def test_api_key_generation(self, authenticator):
        """Test API key generation"""
        user_id = "test_user"
        project_ids = ["project_1", "project_2"]
        
        api_credentials = authenticator.generate_api_key(user_id, project_ids)
        
        assert "api_key" in api_credentials
        assert "api_secret" in api_credentials
        assert "user_id" in api_credentials
        assert api_credentials["user_id"] == user_id
        
        # Check if key was stored
        assert api_credentials["api_key"] in authenticator.api_keys
    
    @pytest.mark.asyncio
    async def test_api_key_validation(self, authenticator):
        """Test API key validation"""
        # Generate API key
        user_id = "test_user"
        api_credentials = authenticator.generate_api_key(user_id)
        
        # Validate correct credentials
        validation_result = authenticator.validate_api_key(
            api_credentials["api_key"],
            api_credentials["api_secret"]
        )
        
        assert validation_result is not None
        assert validation_result["user_id"] == user_id
        
        # Test invalid credentials
        invalid_result = authenticator.validate_api_key("invalid_key", "invalid_secret")
        assert invalid_result is None
    
    @pytest.mark.asyncio
    async def test_session_token_generation(self, authenticator):
        """Test session token generation"""
        user_id = "test_user"
        connection_id = "test_connection"
        project_id = "test_project"
        
        session_token = authenticator.generate_session_token(user_id, connection_id, project_id)
        
        assert session_token is not None
        assert session_token.startswith("sess_")
        
        # Check if token was stored
        assert session_token in authenticator.session_tokens
        
        # Validate session token
        session_info = authenticator.validate_session_token(session_token)
        assert session_info is not None
        assert session_info["user_id"] == user_id
        assert session_info["connection_id"] == connection_id
        assert session_info["project_id"] == project_id
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, authenticator):
        """Test rate limiting"""
        identifier = "test_user"
        
        # Set low rate limit for testing
        authenticator.rate_limit_requests = 3
        
        # Test rate limiting
        for i in range(5):
            can_proceed = authenticator.check_rate_limit(identifier)
            if i < 3:
                assert can_proceed is True
            else:
                assert can_proceed is False
    
    @pytest.mark.asyncio
    async def test_message_validation(self, authenticator):
        """Test message validation"""
        # Valid message
        valid_message = {
            "type": "message",
            "data": {"content": "Hello, world!"}
        }
        
        assert authenticator.validate_message_format(valid_message) is True
        
        # Invalid message (missing type)
        invalid_message = {
            "data": {"content": "Hello, world!"}
        }
        
        assert authenticator.validate_message_format(invalid_message) is False
        
        # Invalid message (malicious content)
        malicious_message = {
            "type": "message",
            "data": {"content": "<script>alert('xss')</script>"}
        }
        
        assert authenticator.validate_message_format(malicious_message) is False
    
    @pytest.mark.asyncio
    async def test_content_sanitization(self, authenticator):
        """Test content sanitization"""
        malicious_data = {
            "content": "<script>alert('xss')</script>",
            "html": "<div>Test</div>",
            "nested": {
                "malicious": "javascript:alert('xss')"
            }
        }
        
        sanitized = authenticator.sanitize_message_data(malicious_data)
        
        # Check that scripts are removed
        assert "<script>" not in sanitized["content"]
        assert "javascript:" not in str(sanitized)
        assert sanitized["content"] == "alert('xss')"
        assert sanitized["html"] == "Test"

# Integration tests
class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_message_flow(self):
        """Test end-to-end message flow"""
        # Create services
        connection_manager = ConnectionManager()
        broadcast_service = BroadcastService()
        event_manager = EventManager()
        
        # Add test connection
        connection_id = "test_conn_1"
        sid = "test_sid_1"
        await connection_manager.add_connection(connection_id, sid, "192.168.1.1", "test-agent")
        
        # Create and send event
        event = event_manager.create_event(
            event_type=WebSocketEvents.NEW_MESSAGE,
            data={"content": "Test message"},
            project_id="test_project"
        )
        
        # Test broadcast (mocked)
        with patch.object(broadcast_service, 'broadcast_to_project', new_callable=AsyncMock) as mock_broadcast:
            await mock_broadcast("test_project", WebSocketEvents.NEW_MESSAGE, event.data)
            mock_broadcast.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_error_recovery_flow(self):
        """Test error recovery flow"""
        error_handler = ErrorHandler()
        status_service = StatusService()
        
        # Simulate error
        test_error = Exception("Test error")
        await error_handler.handle_error(
            error=test_error,
            category=ErrorCategory.REDIS,
            severity=ErrorSeverity.HIGH
        )
        
        # Check if error was recorded
        stats = error_handler.get_error_statistics()
        assert stats["total_errors"] == 1
        assert "redis" in stats["category_distribution"]
        
        # Check if status service was affected
        assert len(status_service.system_status.alerts) > 0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])