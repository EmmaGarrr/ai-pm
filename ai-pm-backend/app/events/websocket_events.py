from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import json

class WebSocketEvents:
    """WebSocket event definitions"""
    
    # Connection events
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    CONNECTION_ERROR = "connection_error"
    AUTHENTICATE = "authenticate"
    AUTHENTICATION_SUCCESS = "authentication_success"
    AUTHENTICATION_FAILED = "authentication_failed"
    
    # Chat events
    NEW_MESSAGE = "new_message"
    MESSAGE_PROCESSED = "message_processed"
    TYPING_INDICATOR = "typing_indicator"
    TYPING_STOP = "typing_stop"
    CHAT_STATUS_UPDATE = "chat_status_update"
    MESSAGE_READ = "message_read"
    MESSAGE_DELETED = "message_deleted"
    
    # Project events
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    PROJECT_DELETED = "project_deleted"
    PROJECT_JOINED = "project_joined"
    PROJECT_LEFT = "project_left"
    
    # AI Processing events
    AI_PROCESSING_START = "ai_processing_start"
    AI_PROCESSING_END = "ai_processing_end"
    AI_PROCESSING_PROGRESS = "ai_processing_progress"
    AI_PROCESSING_ERROR = "ai_processing_error"
    AI_RESPONSE_GENERATED = "ai_response_generated"
    
    # Status events
    SYSTEM_STATUS_UPDATE = "system_status_update"
    HEALTH_CHECK = "health_check"
    METRICS_UPDATE = "metrics_update"
    PERFORMANCE_ALERT = "performance_alert"
    
    # Memory events
    MEMORY_STORED = "memory_stored"
    MEMORY_UPDATED = "memory_updated"
    MEMORY_DELETED = "memory_deleted"
    CONTEXT_ANALYSIS_COMPLETE = "context_analysis_complete"
    SIMILAR_ISSUES_FOUND = "similar_issues_found"
    
    # User events
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_STATUS_CHANGED = "user_status_changed"
    USER_TYPING = "user_typing"
    
    # Admin events
    BROADCAST_MESSAGE = "broadcast_message"
    SYSTEM_NOTIFICATION = "system_notification"
    MAINTENANCE_MODE = "maintenance_mode"
    SERVER_SHUTDOWN = "server_shutdown"
    
    # Error events
    ERROR_OCCURRED = "error_occurred"
    WARNING_ISSUED = "warning_issued"
    RECOVERY_ATTEMPT = "recovery_attempt"
    CONNECTION_RESTORED = "connection_restored"

@dataclass
class WebSocketEvent:
    """WebSocket event data structure"""
    event_type: str
    data: Dict[str, Any]
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: datetime = None
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization"""
        return {
            "event_type": self.event_type,
            "data": self.data,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }
    
    def to_json(self) -> str:
        """Convert event to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WebSocketEvent':
        """Create event from dictionary"""
        return cls(
            event_type=data["event_type"],
            data=data["data"],
            project_id=data.get("project_id"),
            user_id=data.get("user_id"),
            session_id=data.get("session_id"),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            metadata=data.get("metadata", {})
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> 'WebSocketEvent':
        """Create event from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)

class EventPriority(Enum):
    """Event priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class EventSubscription:
    """Event subscription information"""
    event_types: List[str]
    project_ids: List[str]
    user_id: Optional[str] = None
    priority: EventPriority = EventPriority.NORMAL
    filters: Optional[Dict[str, Any]] = None
    
    def matches_event(self, event: WebSocketEvent) -> bool:
        """Check if subscription matches event"""
        # Check event type
        if event.event_type not in self.event_types:
            return False
        
        # Check project ID
        if self.project_ids and event.project_id not in self.project_ids:
            return False
        
        # Check user ID
        if self.user_id and event.user_id != self.user_id:
            return False
        
        # Apply filters
        if self.filters:
            for key, value in self.filters.items():
                if key in event.data and event.data[key] != value:
                    return False
        
        return True

class EventManager:
    """Event management and routing"""
    
    def __init__(self):
        self.subscriptions: Dict[str, List[EventSubscription]] = {}
        self.event_history: List[WebSocketEvent] = []
        self.max_history_size = 1000
    
    def subscribe(self, connection_id: str, subscription: EventSubscription) -> bool:
        """Subscribe to events"""
        if connection_id not in self.subscriptions:
            self.subscriptions[connection_id] = []
        
        self.subscriptions[connection_id].append(subscription)
        return True
    
    def unsubscribe(self, connection_id: str, event_types: Optional[List[str]] = None) -> bool:
        """Unsubscribe from events"""
        if connection_id not in self.subscriptions:
            return False
        
        if event_types is None:
            # Remove all subscriptions for connection
            del self.subscriptions[connection_id]
        else:
            # Remove specific event types
            self.subscriptions[connection_id] = [
                sub for sub in self.subscriptions[connection_id]
                if sub.event_type not in event_types
            ]
        
        return True
    
    def get_subscribers(self, event: WebSocketEvent) -> List[str]:
        """Get list of connection IDs that should receive the event"""
        subscribers = []
        
        for connection_id, subscriptions in self.subscriptions.items():
            for subscription in subscriptions:
                if subscription.matches_event(event):
                    subscribers.append(connection_id)
                    break
        
        return subscribers
    
    def add_to_history(self, event: WebSocketEvent):
        """Add event to history"""
        self.event_history.append(event)
        
        # Maintain history size
        if len(self.event_history) > self.max_history_size:
            self.event_history = self.event_history[-self.max_history_size:]
    
    def get_event_history(self, 
                         event_type: Optional[str] = None,
                         project_id: Optional[str] = None,
                         limit: int = 100) -> List[WebSocketEvent]:
        """Get event history with optional filtering"""
        events = self.event_history
        
        # Apply filters
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        
        if project_id:
            events = [e for e in events if e.project_id == project_id]
        
        # Return most recent events first
        return events[-limit:][::-1]
    
    def create_event(self, 
                    event_type: str,
                    data: Dict[str, Any],
                    project_id: Optional[str] = None,
                    user_id: Optional[str] = None,
                    session_id: Optional[str] = None) -> WebSocketEvent:
        """Create a new event"""
        return WebSocketEvent(
            event_type=event_type,
            data=data,
            project_id=project_id,
            user_id=user_id,
            session_id=session_id
        )
    
    def create_system_event(self, 
                           event_type: str,
                           data: Dict[str, Any]) -> WebSocketEvent:
        """Create a system-wide event"""
        return self.create_event(
            event_type=event_type,
            data=data,
            project_id="system"
        )
    
    def create_project_event(self,
                            project_id: str,
                            event_type: str,
                            data: Dict[str, Any],
                            user_id: Optional[str] = None) -> WebSocketEvent:
        """Create a project-specific event"""
        return self.create_event(
            event_type=event_type,
            data=data,
            project_id=project_id,
            user_id=user_id
        )
    
    def create_user_event(self,
                         user_id: str,
                         event_type: str,
                         data: Dict[str, Any]) -> WebSocketEvent:
        """Create a user-specific event"""
        return self.create_event(
            event_type=event_type,
            data=data,
            user_id=user_id
        )

# Global event manager instance
event_manager = EventManager()

def get_event_manager() -> EventManager:
    """Get event manager instance"""
    return event_manager