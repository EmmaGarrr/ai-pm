import redis.asyncio as redis
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta, date
from app.settings import settings
from app.models.memory import MemoryItem, MessageType, MemoryCreate, MemoryRecall

logger = logging.getLogger(__name__)

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

class RedisService:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.ttl = 86400 * 30  # 30 days default TTL
        
    async def connect(self):
        """Initialize Redis connection"""
        try:
            self.redis = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                db=settings.redis_db,
                password=settings.redis_password,
                decode_responses=True
            )
            await self.redis.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            raise
            
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            
    async def store_memory(self, memory_data: MemoryCreate) -> bool:
        """Store memory item with intelligent indexing"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
            
        try:
            # Create composite key
            memory_key = f"project:{memory_data.project_id}:memory:{memory_data.type}:{memory_data.key}"
            
            # Store the value
            data = {
                "value": memory_data.value,
                "type": memory_data.type,
                "timestamp": datetime.utcnow().isoformat(),
                "project_id": memory_data.project_id,
                "ttl": memory_data.ttl or self.ttl
            }
            
            ttl = memory_data.ttl or self.ttl
            await self.redis.setex(memory_key, ttl, json.dumps(data, cls=CustomJSONEncoder))
            
            # Update project memory index
            await self._update_project_index(memory_data.project_id, memory_key)
            
            logger.info(f"Stored memory: {memory_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            return False
            
    async def recall_memory(self, recall_data: MemoryRecall) -> List[Dict[str, Any]]:
        """Recall memory items based on query"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
            
        try:
            results = []
            memory_types = recall_data.memory_types or [t for t in MessageType]
            
            # Search through each memory type
            for memory_type in memory_types:
                pattern = f"project:{recall_data.project_id}:memory:{memory_type}:*"
                keys = await self.redis.keys(pattern)
                
                for key in keys[:recall_data.limit or 10]:
                    data = await self.redis.get(key)
                    if data:
                        memory_item = json.loads(data)
                        # Simple relevance check - if query is in key or value
                        if recall_data.query.lower() in key.lower() or \
                           recall_data.query.lower() in str(memory_item.get('value', '')).lower():
                            results.append(memory_item)
                            
            # Sort by timestamp (most recent first)
            results.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return results[:recall_data.limit or 10]
            
        except Exception as e:
            logger.error(f"Failed to recall memory: {e}")
            return []
            
    async def delete_memory(self, project_id: str, key: str) -> bool:
        """Delete specific memory item"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
            
        try:
            # Find and delete the memory key
            pattern = f"project:{project_id}:memory:*:{key}"
            keys = await self.redis.keys(pattern)
            
            if keys:
                await self.redis.delete(*keys)
                await self._update_project_index(project_id, None, remove_key=key)
                logger.info(f"Deleted memory: {key}")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete memory: {e}")
            return False
            
    async def get_memory_count(self, project_id: str) -> int:
        """Get count of memory items for project"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
            
        try:
            pattern = f"project:{project_id}:memory:*"
            keys = await self.redis.keys(pattern)
            return len(keys)
            
        except Exception as e:
            logger.error(f"Failed to get memory count: {e}")
            return 0
            
    async def clear_project_memory(self, project_id: str) -> bool:
        """Clear all memory for a project"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
            
        try:
            pattern = f"project:{project_id}:memory:*"
            keys = await self.redis.keys(pattern)
            
            if keys:
                await self.redis.delete(*keys)
                await self.redis.delete(f"project:{project_id}:index")
                logger.info(f"Cleared all memory for project: {project_id}")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Failed to clear project memory: {e}")
            return False
            
    async def health_check(self) -> bool:
        """Check Redis health"""
        if not self.redis:
            return False
            
        try:
            await self.redis.ping()
            return True
        except Exception:
            return False
            
    async def _update_project_index(self, project_id: str, key: str, remove_key: str = None):
        """Update project memory index"""
        if not self.redis:
            return
            
        try:
            index_key = f"project:{project_id}:index"
            
            if remove_key:
                await self.redis.srem(index_key, remove_key)
            elif key:
                await self.redis.sadd(index_key, key)
                
        except Exception as e:
            logger.error(f"Failed to update project index: {e}")

# Global instance
memory_service = RedisService()