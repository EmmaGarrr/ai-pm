from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum

class MessageType(str, Enum):
    ERROR = "error"
    SOLUTION = "solution"
    CONTEXT = "context"
    DEPENDENCY = "dependency"
    MESSAGE = "message"

class MemoryItem(BaseModel):
    key: str
    value: Any
    type: MessageType
    timestamp: datetime
    relevance: Optional[float] = None
    project_id: str
    ttl: Optional[int] = None

class MemoryCreate(BaseModel):
    key: str
    value: Any
    type: MessageType
    project_id: str
    ttl: Optional[int] = None

class MemoryRecall(BaseModel):
    project_id: str
    query: str
    memory_types: Optional[List[MessageType]] = None
    limit: Optional[int] = 10