import asyncio
import json
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
import logging
import socketio
from socketio import AsyncServer
from ..config.websocket import get_websocket_settings
from ..services.connection_manager import ConnectionManager, ConnectionInfo
from ..events.websocket_events import (
    WebSocketEvents, EventManager, WebSocketEvent, EventSubscription, EventPriority
)
from ..utils.logger import get_logger

logger = get_logger(__name__)

class WebSocketService:
    """WebSocket service with Socket.io integration"""
    
    def __init__(self):
        self.settings = get_websocket_settings()
        self.connection_manager = ConnectionManager(
            max_connections=self.settings.max_connections,
            connection_timeout=self.settings.connection_timeout
        )
        self.event_manager = EventManager()
        
        # Create Socket.IO server
        self.sio = AsyncServer(
            async_mode='asgi',
            cors_allowed_origins=self.settings.cors_origins_list,
            logger=self.settings.enable_connection_logging,
            engineio_logger=self.settings.enable_connection_logging
        )
        
        # Event handlers
        self.event_handlers: Dict[str, List[Callable]] = {}
        self.middleware_handlers: List[Callable] = []
        
        # Statistics
        self.start_time = datetime.utcnow()
        self.messages_sent = 0
        self.messages_received = 0
        self.errors_count = 0
        
        # Setup event handlers
        self._setup_event_handlers()
        
        logger.info(f"WebSocketService initialized on port {self.settings.port}")
    
    def _setup_event_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            """Handle new connection"""
            try:
                # Extract connection info
                ip_address = environ.get('REMOTE_ADDR', 'unknown')
                user_agent = environ.get('HTTP_USER_AGENT', 'unknown')
                
                # Generate connection ID
                connection_id = f"conn_{sid}_{datetime.utcnow().timestamp()}"
                
                # Add connection
                success = await self.connection_manager.add_connection(
                    connection_id, sid, ip_address, user_agent
                )
                
                if success:
                    logger.info(f"WebSocket connected: {connection_id} from {ip_address}")
                    
                    # Emit connection event
                    await self.emit_event(WebSocketEvents.CONNECT, {
                        "connection_id": connection_id,
                        "ip_address": ip_address,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                    # Send welcome message
                    await self.sio.emit(WebSocketEvents.CONNECT, {
                        "connection_id": connection_id,
                        "server_time": datetime.utcnow().isoformat(),
                        "features": {
                            "realtime_chat": self.settings.realtime_chat_broadcasting,
                            "realtime_status": self.settings.realtime_status_updates,
                            "realtime_memory": self.settings.realtime_memory_updates
                        }
                    }, room=sid)
                else:
                    logger.warning(f"Connection rejected: {connection_id}")
                    await self.sio.disconnect(sid)
                    
            except Exception as e:
                logger.error(f"Error handling connection: {e}")
                await self.sio.disconnect(sid)
        
        @self.sio.event
        async def disconnect(sid):
            """Handle disconnection"""
            try:
                connection_info = self.connection_manager.get_connection_by_sid(sid)
                if connection_info:
                    connection_id = connection_info.connection_id
                    
                    # Remove connection
                    await self.connection_manager.remove_connection(connection_id)
                    
                    # Emit disconnect event
                    await self.emit_event(WebSocketEvents.DISCONNECT, {
                        "connection_id": connection_id,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                    logger.info(f"WebSocket disconnected: {connection_id}")
                    
            except Exception as e:
                logger.error(f"Error handling disconnection: {e}")
        
        @self.sio.event
        async def message(sid, data):
            """Handle incoming message"""
            try:
                connection_info = self.connection_manager.get_connection_by_sid(sid)
                if not connection_info:
                    logger.warning(f"Message from unknown connection: {sid}")
                    return
                
                # Check rate limit
                if not await self.connection_manager.check_rate_limit(connection_info.connection_id):
                    logger.warning(f"Rate limit exceeded: {connection_info.connection_id}")
                    await self.sio.emit(WebSocketEvents.WARNING_ISSUED, {
                        "type": "rate_limit",
                        "message": "Message rate limit exceeded"
                    }, room=sid)
                    return
                
                # Record message
                await self.connection_manager.record_message(connection_info.connection_id)
                self.messages_received += 1
                
                # Process message through middleware
                processed_data = await self._process_middleware(data, connection_info)
                if processed_data is None:
                    return
                
                # Handle different message types
                event_type = processed_data.get('event')
                payload = processed_data.get('data', {})
                
                # Route to appropriate handler
                await self._handle_message(connection_info, event_type, payload)
                
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                self.errors_count += 1
        
        @self.sio.event
        async def authenticate(sid, data):
            """Handle authentication"""
            try:
                connection_info = self.connection_manager.get_connection_by_sid(sid)
                if not connection_info:
                    return
                
                user_id = data.get('user_id')
                token = data.get('token')
                
                # Simple authentication (in production, use proper JWT validation)
                if user_id and token:
                    success = await self.connection_manager.authenticate_connection(
                        connection_info.connection_id, user_id
                    )
                    
                    if success:
                        await self.sio.emit(WebSocketEvents.AUTHENTICATION_SUCCESS, {
                            "user_id": user_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }, room=sid)
                        
                        await self.emit_event(WebSocketEvents.AUTHENTICATION_SUCCESS, {
                            "user_id": user_id,
                            "connection_id": connection_info.connection_id
                        })
                    else:
                        await self.sio.emit(WebSocketEvents.AUTHENTICATION_FAILED, {
                            "error": "Authentication failed"
                        }, room=sid)
                else:
                    await self.sio.emit(WebSocketEvents.AUTHENTICATION_FAILED, {
                        "error": "Invalid credentials"
                    }, room=sid)
                    
            except Exception as e:
                logger.error(f"Error handling authentication: {e}")
        
        @self.sio.event
        async def join_project(sid, data):
            """Handle joining a project room"""
            try:
                connection_info = self.connection_manager.get_connection_by_sid(sid)
                if not connection_info:
                    return
                
                project_id = data.get('project_id')
                if project_id:
                    success = await self.connection_manager.join_project(
                        connection_info.connection_id, project_id
                    )
                    
                    if success:
                        # Join Socket.IO room
                        await self.sio.enter_room(sid, f"project_{project_id}")
                        
                        await self.emit_event(WebSocketEvents.PROJECT_JOINED, {
                            "project_id": project_id,
                            "user_id": connection_info.user_id,
                            "connection_id": connection_info.connection_id
                        })
                        
                        logger.info(f"Connection {connection_info.connection_id} joined project {project_id}")
                    
            except Exception as e:
                logger.error(f"Error handling join_project: {e}")
        
        @self.sio.event
        async def leave_project(sid, data):
            """Handle leaving a project room"""
            try:
                connection_info = self.connection_manager.get_connection_by_sid(sid)
                if not connection_info:
                    return
                
                project_id = data.get('project_id')
                if project_id:
                    success = await self.connection_manager.leave_project(
                        connection_info.connection_id, project_id
                    )
                    
                    if success:
                        # Leave Socket.IO room
                        await self.sio.leave_room(sid, f"project_{project_id}")
                        
                        await self.emit_event(WebSocketEvents.PROJECT_LEFT, {
                            "project_id": project_id,
                            "user_id": connection_info.user_id,
                            "connection_id": connection_info.connection_id
                        })
                        
                        logger.info(f"Connection {connection_info.connection_id} left project {project_id}")
                    
            except Exception as e:
                logger.error(f"Error handling leave_project: {e}")
        
        @self.sio.event
        async def heartbeat(sid):
            """Handle heartbeat"""
            try:
                connection_info = self.connection_manager.get_connection_by_sid(sid)
                if connection_info:
                    await self.connection_manager.record_heartbeat(connection_info.connection_id)
                    await self.sio.emit('heartbeat_response', {
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=sid)
                    
            except Exception as e:
                logger.error(f"Error handling heartbeat: {e}")
    
    async def _process_middleware(self, data: Any, connection_info: ConnectionInfo) -> Optional[Dict[str, Any]]:
        """Process message through middleware handlers"""
        try:
            if isinstance(data, str):
                data = json.loads(data)
            
            for handler in self.middleware_handlers:
                result = await handler(data, connection_info)
                if result is None:
                    return None
                data = result
            
            return data
            
        except json.JSONDecodeError:
            logger.error("Invalid JSON in message")
            return None
        except Exception as e:
            logger.error(f"Error in middleware processing: {e}")
            return None
    
    async def _handle_message(self, connection_info: ConnectionInfo, event_type: str, payload: Dict[str, Any]):
        """Handle incoming message by routing to appropriate handler"""
        try:
            # Find handlers for this event type
            handlers = self.event_handlers.get(event_type, [])
            
            if not handlers:
                logger.warning(f"No handlers for event: {event_type}")
                return
            
            # Call all handlers
            for handler in handlers:
                try:
                    await handler(connection_info, payload)
                except Exception as e:
                    logger.error(f"Error in event handler for {event_type}: {e}")
                    self.errors_count += 1
                    
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            self.errors_count += 1
    
    def add_event_handler(self, event_type: str, handler: Callable):
        """Add event handler for specific event type"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        
        self.event_handlers[event_type].append(handler)
        logger.info(f"Added handler for event: {event_type}")
    
    def add_middleware_handler(self, handler: Callable):
        """Add middleware handler for message processing"""
        self.middleware_handlers.append(handler)
        logger.info("Added middleware handler")
    
    async def emit_event(self, event_type: str, data: Dict[str, Any], 
                        project_id: Optional[str] = None,
                        user_id: Optional[str] = None,
                        exclude_connection: Optional[str] = None):
        """Emit event to appropriate connections"""
        try:
            # Create WebSocket event
            event = self.event_manager.create_event(
                event_type=event_type,
                data=data,
                project_id=project_id,
                user_id=user_id
            )
            
            # Add to event history
            self.event_manager.add_to_history(event)
            
            # Get target connections
            target_connections = []
            
            if project_id:
                # Send to project connections
                connections = self.connection_manager.get_project_connections(project_id)
                target_connections.extend(conn_info.connection_id for conn_info in connections)
            
            if user_id:
                # Send to user connections
                connections = self.connection_manager.get_user_connections(user_id)
                target_connections.extend(conn_info.connection_id for conn_info in connections)
            
            # Remove excluded connection
            if exclude_connection and exclude_connection in target_connections:
                target_connections.remove(exclude_connection)
            
            # Remove duplicates
            target_connections = list(set(target_connections))
            
            # Emit to target connections
            for connection_id in target_connections:
                connection_info = self.connection_manager.get_connection(connection_id)
                if connection_info:
                    await self.sio.emit(event_type, data, room=connection_info.sid)
                    self.messages_sent += 1
            
            logger.debug(f"Emitted event {event_type} to {len(target_connections)} connections")
            
        except Exception as e:
            logger.error(f"Error emitting event {event_type}: {e}")
            self.errors_count += 1
    
    async def broadcast_to_project(self, project_id: str, event_type: str, data: Dict[str, Any]):
        """Broadcast event to all connections in a project"""
        await self.emit_event(event_type, data, project_id=project_id)
    
    async def broadcast_to_user(self, user_id: str, event_type: str, data: Dict[str, Any]):
        """Broadcast event to all connections of a user"""
        await self.emit_event(event_type, data, user_id=user_id)
    
    async def broadcast_system_event(self, event_type: str, data: Dict[str, Any]):
        """Broadcast system-wide event"""
        await self.emit_event(event_type, data, project_id="system")
    
    async def send_to_connection(self, connection_id: str, event_type: str, data: Dict[str, Any]):
        """Send event to specific connection"""
        try:
            connection_info = self.connection_manager.get_connection(connection_id)
            if connection_info:
                await self.sio.emit(event_type, data, room=connection_info.sid)
                self.messages_sent += 1
            else:
                logger.warning(f"Connection not found: {connection_id}")
                
        except Exception as e:
            logger.error(f"Error sending to connection {connection_id}: {e}")
            self.errors_count += 1
    
    async def get_connection_status(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get connection status"""
        connection_info = self.connection_manager.get_connection(connection_id)
        if connection_info:
            return {
                "connected": True,
                "authenticated": connection_info.is_authenticated,
                "user_id": connection_info.user_id,
                "project_ids": list(connection_info.project_ids),
                "uptime": connection_info.get_uptime(),
                "message_count": connection_info.message_count
            }
        return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get WebSocket service statistics"""
        conn_stats = self.connection_manager.get_statistics()
        
        return {
            "service": {
                "uptime": (datetime.utcnow() - self.start_time).total_seconds(),
                "messages_sent": self.messages_sent,
                "messages_received": self.messages_received,
                "errors_count": self.errors_count,
                "event_handlers_count": len(self.event_handlers),
                "middleware_count": len(self.middleware_handlers)
            },
            "connections": conn_stats,
            "settings": {
                "enabled": self.settings.enabled,
                "port": self.settings.port,
                "max_connections": self.settings.max_connections,
                "realtime_features": {
                    "chat": self.settings.realtime_chat_broadcasting,
                    "status": self.settings.realtime_status_updates,
                    "memory": self.settings.realtime_memory_updates
                }
            }
        }
    
    async def start(self):
        """Start WebSocket service"""
        await self.connection_manager.start()
        logger.info("WebSocket service started")
    
    async def stop(self):
        """Stop WebSocket service"""
        await self.connection_manager.stop()
        logger.info("WebSocket service stopped")
    
    def get_socketio_app(self):
        """Get Socket.IO ASGI application"""
        return self.sio
    
    def validate_configuration(self) -> List[str]:
        """Validate WebSocket configuration"""
        return self.settings.validate_settings()

# Global WebSocket service instance
websocket_service = WebSocketService()

def get_websocket_service() -> WebSocketService:
    """Get WebSocket service instance"""
    return websocket_service