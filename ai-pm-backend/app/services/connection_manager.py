import asyncio
import time
import json
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
from ..utils.logger import get_logger
from ..events.websocket_events import WebSocketEvents, EventSubscription, EventPriority

logger = get_logger(__name__)

class ConnectionInfo:
    """Information about a WebSocket connection"""
    
    def __init__(self, connection_id: str, sid: str, ip_address: str, user_agent: str):
        self.connection_id = connection_id
        self.sid = sid
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.user_id: Optional[str] = None
        self.project_ids: Set[str] = set()
        self.session_id: Optional[str] = None
        self.connected_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.is_authenticated = False
        self.subscriptions: List[EventSubscription] = []
        self.message_count = 0
        self.heartbeat_count = 0
        self.reconnect_attempts = 0
        self.metadata: Dict[str, Any] = {}
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
    
    def add_project(self, project_id: str):
        """Add project to connection"""
        self.project_ids.add(project_id)
        self.update_activity()
    
    def remove_project(self, project_id: str):
        """Remove project from connection"""
        self.project_ids.discard(project_id)
        self.update_activity()
    
    def authenticate(self, user_id: str):
        """Authenticate connection"""
        self.user_id = user_id
        self.is_authenticated = True
        self.update_activity()
    
    def deauthenticate(self):
        """Deauthenticate connection"""
        self.user_id = None
        self.is_authenticated = False
        self.update_activity()
    
    def add_subscription(self, subscription: EventSubscription):
        """Add event subscription"""
        self.subscriptions.append(subscription)
        self.update_activity()
    
    def remove_subscriptions(self, event_types: Optional[List[str]] = None):
        """Remove event subscriptions"""
        if event_types is None:
            self.subscriptions.clear()
        else:
            self.subscriptions = [
                sub for sub in self.subscriptions
                if sub.event_type not in event_types
            ]
        self.update_activity()
    
    def increment_message_count(self):
        """Increment message count"""
        self.message_count += 1
        self.update_activity()
    
    def increment_heartbeat_count(self):
        """Increment heartbeat count"""
        self.heartbeat_count += 1
        self.update_activity()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert connection info to dictionary"""
        return {
            "connection_id": self.connection_id,
            "sid": self.sid,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "user_id": self.user_id,
            "project_ids": list(self.project_ids),
            "session_id": self.session_id,
            "connected_at": self.connected_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "is_authenticated": self.is_authenticated,
            "subscription_count": len(self.subscriptions),
            "message_count": self.message_count,
            "heartbeat_count": self.heartbeat_count,
            "reconnect_attempts": self.reconnect_attempts,
            "metadata": self.metadata
        }
    
    def is_active(self, timeout_seconds: int = 300) -> bool:
        """Check if connection is active based on last activity"""
        return (datetime.utcnow() - self.last_activity).total_seconds() < timeout_seconds
    
    def get_uptime(self) -> float:
        """Get connection uptime in seconds"""
        return (datetime.utcnow() - self.connected_at).total_seconds()

class ConnectionManager:
    """Manages WebSocket connections and their lifecycle"""
    
    def __init__(self, max_connections: int = 1000, connection_timeout: int = 300):
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout
        
        # Connection storage
        self.connections: Dict[str, ConnectionInfo] = {}
        self.sid_to_connection: Dict[str, str] = {}  # sid -> connection_id mapping
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)  # user_id -> connection_ids
        self.project_connections: Dict[str, Set[str]] = defaultdict(set)  # project_id -> connection_ids
        
        # Statistics
        self.total_connections = 0
        self.active_connections = 0
        self.messages_processed = 0
        self.connections_per_ip: Dict[str, int] = defaultdict(int)
        
        # Rate limiting
        self.message_rates: Dict[str, deque] = defaultdict(lambda: deque(maxlen=60))  # connection_id -> timestamps
        self.rate_limit_messages = 100  # messages per minute
        
        # Cleanup
        self.cleanup_task: Optional[asyncio.Task] = None
        self.heartbeat_task: Optional[asyncio.Task] = None
        
        logger.info(f"ConnectionManager initialized with max_connections={max_connections}")
    
    async def start(self):
        """Start connection manager background tasks"""
        self.cleanup_task = asyncio.create_task(self._cleanup_inactive_connections())
        self.heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
        logger.info("ConnectionManager background tasks started")
    
    async def stop(self):
        """Stop connection manager background tasks"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
        logger.info("ConnectionManager background tasks stopped")
    
    async def add_connection(self, connection_id: str, sid: str, ip_address: str, user_agent: str) -> bool:
        """Add a new connection"""
        try:
            # Check connection limits
            if len(self.connections) >= self.max_connections:
                logger.warning(f"Connection limit reached: {len(self.connections)}/{self.max_connections}")
                return False
            
            # Check IP rate limiting
            if self.connections_per_ip[ip_address] >= 10:  # Max 10 connections per IP
                logger.warning(f"IP connection limit reached: {ip_address}")
                return False
            
            # Create connection info
            connection_info = ConnectionInfo(connection_id, sid, ip_address, user_agent)
            
            # Store connection
            self.connections[connection_id] = connection_info
            self.sid_to_connection[sid] = connection_id
            self.connections_per_ip[ip_address] += 1
            
            # Update statistics
            self.total_connections += 1
            self.active_connections += 1
            
            logger.info(f"Connection added: {connection_id} from {ip_address}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding connection {connection_id}: {e}")
            return False
    
    async def remove_connection(self, connection_id: str) -> bool:
        """Remove a connection"""
        try:
            if connection_id not in self.connections:
                logger.warning(f"Connection not found: {connection_id}")
                return False
            
            connection_info = self.connections[connection_id]
            
            # Remove from user connections
            if connection_info.user_id:
                self.user_connections[connection_info.user_id].discard(connection_id)
            
            # Remove from project connections
            for project_id in connection_info.project_ids:
                self.project_connections[project_id].discard(connection_id)
            
            # Remove from IP tracking
            self.connections_per_ip[connection_info.ip_address] -= 1
            if self.connections_per_ip[connection_info.ip_address] <= 0:
                del self.connections_per_ip[connection_info.ip_address]
            
            # Remove from mappings
            if connection_info.sid in self.sid_to_connection:
                del self.sid_to_connection[connection_info.sid]
            
            # Remove connection
            del self.connections[connection_id]
            self.active_connections -= 1
            
            logger.info(f"Connection removed: {connection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing connection {connection_id}: {e}")
            return False
    
    def get_connection(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Get connection information"""
        return self.connections.get(connection_id)
    
    def get_connection_by_sid(self, sid: str) -> Optional[ConnectionInfo]:
        """Get connection by Socket.IO sid"""
        connection_id = self.sid_to_connection.get(sid)
        return self.connections.get(connection_id) if connection_id else None
    
    def get_user_connections(self, user_id: str) -> List[ConnectionInfo]:
        """Get all connections for a user"""
        connection_ids = self.user_connections.get(user_id, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    def get_project_connections(self, project_id: str) -> List[ConnectionInfo]:
        """Get all connections for a project"""
        connection_ids = self.project_connections.get(project_id, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    async def authenticate_connection(self, connection_id: str, user_id: str) -> bool:
        """Authenticate a connection"""
        connection_info = self.get_connection(connection_id)
        if not connection_info:
            return False
        
        # Remove from old user connections if already authenticated
        if connection_info.user_id:
            self.user_connections[connection_info.user_id].discard(connection_id)
        
        # Authenticate connection
        connection_info.authenticate(user_id)
        self.user_connections[user_id].add(connection_id)
        
        logger.info(f"Connection authenticated: {connection_id} -> {user_id}")
        return True
    
    async def join_project(self, connection_id: str, project_id: str) -> bool:
        """Join a project room"""
        connection_info = self.get_connection(connection_id)
        if not connection_info:
            return False
        
        connection_info.add_project(project_id)
        self.project_connections[project_id].add(connection_id)
        
        logger.info(f"Connection {connection_id} joined project {project_id}")
        return True
    
    async def leave_project(self, connection_id: str, project_id: str) -> bool:
        """Leave a project room"""
        connection_info = self.get_connection(connection_id)
        if not connection_info:
            return False
        
        connection_info.remove_project(project_id)
        self.project_connections[project_id].discard(connection_id)
        
        logger.info(f"Connection {connection_id} left project {project_id}")
        return True
    
    async def check_rate_limit(self, connection_id: str) -> bool:
        """Check if connection exceeds rate limit"""
        now = time.time()
        rate_queue = self.message_rates[connection_id]
        
        # Add current message timestamp
        rate_queue.append(now)
        
        # Remove old timestamps (older than 1 minute)
        cutoff = now - 60
        while rate_queue and rate_queue[0] < cutoff:
            rate_queue.popleft()
        
        # Check if rate limit exceeded
        return len(rate_queue) <= self.rate_limit_messages
    
    async def record_message(self, connection_id: str):
        """Record a message for statistics"""
        connection_info = self.get_connection(connection_id)
        if connection_info:
            connection_info.increment_message_count()
            self.messages_processed += 1
    
    async def record_heartbeat(self, connection_id: str):
        """Record a heartbeat"""
        connection_info = self.get_connection(connection_id)
        if connection_info:
            connection_info.increment_heartbeat_count()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": self.total_connections,
            "active_connections": self.active_connections,
            "messages_processed": self.messages_processed,
            "unique_users": len(self.user_connections),
            "active_projects": len(self.project_connections),
            "connections_per_ip": dict(self.connections_per_ip),
            "top_projects": self._get_top_projects(),
            "average_uptime": self._get_average_uptime(),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _get_top_projects(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top projects by connection count"""
        project_stats = []
        for project_id, connection_ids in self.project_connections.items():
            active_connections = len([cid for cid in connection_ids if cid in self.connections])
            project_stats.append({
                "project_id": project_id,
                "active_connections": active_connections
            })
        
        return sorted(project_stats, key=lambda x: x["active_connections"], reverse=True)[:limit]
    
    def _get_average_uptime(self) -> float:
        """Get average connection uptime"""
        if not self.connections:
            return 0.0
        
        total_uptime = sum(conn.get_uptime() for conn in self.connections.values())
        return total_uptime / len(self.connections)
    
    async def _cleanup_inactive_connections(self):
        """Cleanup inactive connections"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                inactive_connections = []
                for connection_id, connection_info in self.connections.items():
                    if not connection_info.is_active(self.connection_timeout):
                        inactive_connections.append(connection_id)
                
                for connection_id in inactive_connections:
                    logger.info(f"Cleaning up inactive connection: {connection_id}")
                    await self.remove_connection(connection_id)
                
                if inactive_connections:
                    logger.info(f"Cleaned up {len(inactive_connections)} inactive connections")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
    
    async def _heartbeat_monitor(self):
        """Monitor connection heartbeats"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Get connection statistics
                stats = self.get_statistics()
                logger.debug(f"Connection stats: {stats}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat monitor: {e}")
    
    def get_connection_details(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed connection information"""
        connection_info = self.get_connection(connection_id)
        if not connection_info:
            return None
        
        details = connection_info.to_dict()
        details.update({
            "rate_limited": not self.check_rate_limit(connection_id),
            "subscription_details": [
                {
                    "event_types": sub.event_types,
                    "project_ids": sub.project_ids,
                    "priority": sub.priority.name
                }
                for sub in connection_info.subscriptions
            ]
        })
        
        return details