import asyncio
import json
from typing import Dict, Any, Optional, List, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
from ..services.websocket_service import get_websocket_service
from ..events.websocket_events import WebSocketEvents, WebSocketEvent
from ..utils.logger import get_logger

logger = get_logger(__name__)

class BroadcastMessage:
    """Broadcast message with delivery tracking"""
    
    def __init__(self, message_id: str, event_type: str, data: Dict[str, Any], 
                 target_type: str, target_ids: List[str], priority: int = 1):
        self.message_id = message_id
        self.event_type = event_type
        self.data = data
        self.target_type = target_type  # 'project', 'user', 'connection', 'system'
        self.target_ids = target_ids
        self.priority = priority
        self.created_at = datetime.utcnow()
        self.delivered_to: Set[str] = set()
        self.failed_to: Set[str] = set()
        self.attempts = 0
        self.max_attempts = 3
        self.delay = 1.0  # Initial delay in seconds
    
    def should_retry(self) -> bool:
        """Check if message should be retried"""
        return self.attempts < self.max_attempts
    
    def get_retry_delay(self) -> float:
        """Get retry delay with exponential backoff"""
        return self.delay * (2 ** self.attempts)
    
    def mark_delivered(self, connection_id: str):
        """Mark message as delivered to connection"""
        self.delivered_to.add(connection_id)
    
    def mark_failed(self, connection_id: str):
        """Mark message as failed to deliver to connection"""
        self.failed_to.add(connection_id)
    
    def is_complete(self) -> bool:
        """Check if message delivery is complete"""
        return len(self.delivered_to) >= len(self.target_ids) or not self.should_retry()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get message delivery statistics"""
        return {
            "message_id": self.message_id,
            "event_type": self.event_type,
            "target_type": self.target_type,
            "target_count": len(self.target_ids),
            "delivered_count": len(self.delivered_to),
            "failed_count": len(self.failed_to),
            "attempts": self.attempts,
            "created_at": self.created_at.isoformat(),
            "is_complete": self.is_complete()
        }

class BroadcastService:
    """Service for managing message broadcasting with reliability"""
    
    def __init__(self, max_queue_size: int = 1000, max_retries: int = 3):
        self.max_queue_size = max_queue_size
        self.max_retries = max_retries
        
        # Message queues
        self.high_priority_queue: deque = deque(maxlen=max_queue_size)
        self.normal_priority_queue: deque = deque(maxlen=max_queue_size)
        self.low_priority_queue: deque = deque(maxlen=max_queue_size)
        
        # Active broadcasts
        self.active_broadcasts: Dict[str, BroadcastMessage] = {}
        
        # Statistics
        self.total_broadcasts = 0
        self.successful_deliveries = 0
        self.failed_deliveries = 0
        self.retry_count = 0
        
        # Background tasks
        self.broadcast_task: Optional[asyncio.Task] = None
        self.cleanup_task: Optional[asyncio.Task] = None
        
        # Rate limiting
        self.broadcast_rates: Dict[str, deque] = defaultdict(lambda: deque(maxlen=60))
        self.max_broadcasts_per_minute = 100
        
        logger.info("BroadcastService initialized")
    
    async def start(self):
        """Start broadcast service background tasks"""
        self.broadcast_task = asyncio.create_task(self._broadcast_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_completed_broadcasts())
        logger.info("BroadcastService background tasks started")
    
    async def stop(self):
        """Stop broadcast service background tasks"""
        if self.broadcast_task:
            self.broadcast_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        logger.info("BroadcastService background tasks stopped")
    
    async def broadcast_to_project(self, project_id: str, event_type: str, data: Dict[str, Any], 
                                  priority: int = 1) -> str:
        """Broadcast message to all connections in a project"""
        try:
            # Generate message ID
            message_id = f"proj_{project_id}_{event_type}_{datetime.utcnow().timestamp()}"
            
            # Get WebSocket service
            websocket_service = get_websocket_service()
            
            # Get project connections
            connections = websocket_service.connection_manager.get_project_connections(project_id)
            target_ids = [conn.connection_id for conn in connections]
            
            if not target_ids:
                logger.warning(f"No connections found for project {project_id}")
                return message_id
            
            # Create broadcast message
            message = BroadcastMessage(
                message_id=message_id,
                event_type=event_type,
                data=data,
                target_type="project",
                target_ids=target_ids,
                priority=priority
            )
            
            # Add to appropriate queue
            self._add_to_queue(message)
            
            logger.info(f"Broadcast to project {project_id}: {message_id} to {len(target_ids)} connections")
            return message_id
            
        except Exception as e:
            logger.error(f"Error broadcasting to project {project_id}: {e}")
            raise
    
    async def broadcast_to_user(self, user_id: str, event_type: str, data: Dict[str, Any], 
                               priority: int = 1) -> str:
        """Broadcast message to all connections of a user"""
        try:
            # Generate message ID
            message_id = f"user_{user_id}_{event_type}_{datetime.utcnow().timestamp()}"
            
            # Get WebSocket service
            websocket_service = get_websocket_service()
            
            # Get user connections
            connections = websocket_service.connection_manager.get_user_connections(user_id)
            target_ids = [conn.connection_id for conn in connections]
            
            if not target_ids:
                logger.warning(f"No connections found for user {user_id}")
                return message_id
            
            # Create broadcast message
            message = BroadcastMessage(
                message_id=message_id,
                event_type=event_type,
                data=data,
                target_type="user",
                target_ids=target_ids,
                priority=priority
            )
            
            # Add to appropriate queue
            self._add_to_queue(message)
            
            logger.info(f"Broadcast to user {user_id}: {message_id} to {len(target_ids)} connections")
            return message_id
            
        except Exception as e:
            logger.error(f"Error broadcasting to user {user_id}: {e}")
            raise
    
    async def broadcast_to_connections(self, connection_ids: List[str], event_type: str, 
                                      data: Dict[str, Any], priority: int = 1) -> str:
        """Broadcast message to specific connections"""
        try:
            # Generate message ID
            message_id = f"conn_{len(connection_ids)}_{event_type}_{datetime.utcnow().timestamp()}"
            
            # Create broadcast message
            message = BroadcastMessage(
                message_id=message_id,
                event_type=event_type,
                data=data,
                target_type="connection",
                target_ids=connection_ids,
                priority=priority
            )
            
            # Add to appropriate queue
            self._add_to_queue(message)
            
            logger.info(f"Broadcast to connections: {message_id} to {len(connection_ids)} connections")
            return message_id
            
        except Exception as e:
            logger.error(f"Error broadcasting to connections: {e}")
            raise
    
    async def broadcast_system_event(self, event_type: str, data: Dict[str, Any], 
                                   priority: int = 2) -> str:
        """Broadcast system-wide event"""
        try:
            # Generate message ID
            message_id = f"sys_{event_type}_{datetime.utcnow().timestamp()}"
            
            # Get WebSocket service
            websocket_service = get_websocket_service()
            
            # Get all active connections
            target_ids = list(websocket_service.connection_manager.connections.keys())
            
            if not target_ids:
                logger.warning("No active connections for system broadcast")
                return message_id
            
            # Create broadcast message
            message = BroadcastMessage(
                message_id=message_id,
                event_type=event_type,
                data=data,
                target_type="system",
                target_ids=target_ids,
                priority=priority
            )
            
            # Add to appropriate queue
            self._add_to_queue(message)
            
            logger.info(f"System broadcast: {message_id} to {len(target_ids)} connections")
            return message_id
            
        except Exception as e:
            logger.error(f"Error broadcasting system event: {e}")
            raise
    
    def _add_to_queue(self, message: BroadcastMessage):
        """Add message to appropriate priority queue"""
        if message.priority >= 3:
            self.high_priority_queue.append(message)
        elif message.priority >= 2:
            self.normal_priority_queue.append(message)
        else:
            self.low_priority_queue.append(message)
        
        self.active_broadcasts[message.message_id] = message
        self.total_broadcasts += 1
    
    async def _broadcast_loop(self):
        """Main broadcast processing loop"""
        while True:
            try:
                # Process high priority first
                if self.high_priority_queue:
                    await self._process_broadcast(self.high_priority_queue.popleft())
                elif self.normal_priority_queue:
                    await self._process_broadcast(self.normal_priority_queue.popleft())
                elif self.low_priority_queue:
                    await self._process_broadcast(self.low_priority_queue.popleft())
                else:
                    # No messages to process
                    await asyncio.sleep(0.1)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}")
                await asyncio.sleep(1)
    
    async def _process_broadcast(self, message: BroadcastMessage):
        """Process a single broadcast message"""
        try:
            # Get WebSocket service
            websocket_service = get_websocket_service()
            
            # Check rate limiting
            if not self._check_rate_limit(message.message_id):
                logger.warning(f"Rate limit exceeded for broadcast: {message.message_id}")
                return
            
            # Send message to all target connections
            for connection_id in message.target_ids:
                try:
                    if connection_id not in message.delivered_to:
                        connection_info = websocket_service.connection_manager.get_connection(connection_id)
                        if connection_info:
                            await websocket_service.send_to_connection(
                                connection_id, message.event_type, message.data
                            )
                            message.mark_delivered(connection_id)
                            self.successful_deliveries += 1
                        else:
                            message.mark_failed(connection_id)
                            self.failed_deliveries += 1
                
                except Exception as e:
                    logger.error(f"Error sending to connection {connection_id}: {e}")
                    message.mark_failed(connection_id)
                    self.failed_deliveries += 1
            
            message.attempts += 1
            
            # Check if retry is needed
            if not message.is_complete() and message.should_retry():
                retry_delay = message.get_retry_delay()
                logger.info(f"Retrying broadcast {message.message_id} in {retry_delay}s")
                
                # Schedule retry
                asyncio.create_task(self._retry_broadcast(message, retry_delay))
                self.retry_count += 1
            
            logger.debug(f"Broadcast processed: {message.get_stats()}")
            
        except Exception as e:
            logger.error(f"Error processing broadcast {message.message_id}: {e}")
            self.failed_deliveries += 1
    
    async def _retry_broadcast(self, message: BroadcastMessage, delay: float):
        """Retry a failed broadcast"""
        try:
            await asyncio.sleep(delay)
            
            if not message.is_complete():
                # Add back to queue for retry
                self._add_to_queue(message)
                logger.info(f"Broadcast {message.message_id} queued for retry")
            
        except Exception as e:
            logger.error(f"Error retrying broadcast {message.message_id}: {e}")
    
    def _check_rate_limit(self, message_id: str) -> bool:
        """Check if broadcast rate limit is exceeded"""
        now = datetime.utcnow()
        rate_key = now.strftime("%Y-%m-%d %H:%M")
        rate_queue = self.broadcast_rates[rate_key]
        
        # Add current broadcast timestamp
        rate_queue.append(now)
        
        # Remove old timestamps (older than 1 minute)
        cutoff = now - timedelta(minutes=1)
        while rate_queue and rate_queue[0] < cutoff:
            rate_queue.popleft()
        
        # Check if rate limit exceeded
        return len(rate_queue) <= self.max_broadcasts_per_minute
    
    async def _cleanup_completed_broadcasts(self):
        """Cleanup completed broadcast messages"""
        while True:
            try:
                await asyncio.sleep(300)  # Cleanup every 5 minutes
                
                # Remove completed broadcasts older than 1 hour
                cutoff = datetime.utcnow() - timedelta(hours=1)
                completed_messages = [
                    msg_id for msg_id, msg in self.active_broadcasts.items()
                    if msg.is_complete() and msg.created_at < cutoff
                ]
                
                for msg_id in completed_messages:
                    del self.active_broadcasts[msg_id]
                
                if completed_messages:
                    logger.info(f"Cleaned up {len(completed_messages)} completed broadcasts")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
    
    def get_broadcast_stats(self) -> Dict[str, Any]:
        """Get broadcast service statistics"""
        queue_stats = {
            "high_priority": len(self.high_priority_queue),
            "normal_priority": len(self.normal_priority_queue),
            "low_priority": len(self.low_priority_queue)
        }
        
        active_stats = {
            "total": len(self.active_broadcasts),
            "completed": len([msg for msg in self.active_broadcasts.values() if msg.is_complete()]),
            "pending": len([msg for msg in self.active_broadcasts.values() if not msg.is_complete()])
        }
        
        return {
            "queues": queue_stats,
            "active_broadcasts": active_stats,
            "total_broadcasts": self.total_broadcasts,
            "successful_deliveries": self.successful_deliveries,
            "failed_deliveries": self.failed_deliveries,
            "retry_count": self.retry_count,
            "success_rate": self.successful_deliveries / max(1, self.total_broadcasts),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_broadcast_status(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific broadcast"""
        message = self.active_broadcasts.get(message_id)
        if message:
            return message.get_stats()
        return None
    
    def get_active_broadcasts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get list of active broadcasts"""
        broadcasts = sorted(
            self.active_broadcasts.values(),
            key=lambda x: x.created_at,
            reverse=True
        )
        return [msg.get_stats() for msg in broadcasts[:limit]]

# Global broadcast service instance
broadcast_service = BroadcastService()

def get_broadcast_service() -> BroadcastService:
    """Get broadcast service instance"""
    return broadcast_service