from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import uuid

class MessageRole(str, Enum):
    USER = "user"
    AI_PM = "ai_pm"
    SYSTEM = "system"

class MessageType(str, Enum):
    ERROR = "error"
    SOLUTION = "solution"
    CONTEXT = "context"
    DEPENDENCY = "dependency"

class MessageMetadata(BaseModel):
    for_developer: Optional[bool] = False
    instruction: Optional[str] = None
    summary: Optional[str] = None
    confidence: Optional[float] = None
    memory_keys: Optional[List[str]] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[MessageMetadata] = None

class ProjectStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None
    status: ProjectStatus = ProjectStatus.ACTIVE

class MemoryItem(BaseModel):
    key: str
    value: Any
    type: MessageType
    timestamp: datetime
    relevance: Optional[float] = None
    project_id: str
    ttl: Optional[int] = None