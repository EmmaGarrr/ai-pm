from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from uuid import uuid4
from enum import Enum

class AIPromptType(str, Enum):
    SYSTEM = "system"
    USER_EXPLANATION = "user_explanation"
    TECHNICAL_INSTRUCTION = "technical_instruction"
    VERIFICATION = "verification"

class AIResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"
    VERIFICATION_REQUIRED = "verification_required"

class AIMetadata(BaseModel):
    memory_keys: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    context_items: int = Field(default=0)
    processing_time: float = Field(default=0.0)
    attempt: int = Field(default=1)
    verification_intensity: str = Field(default="basic")
    model_info: Optional[Dict[str, Any]] = None
    error_info: Optional[str] = None

class AIResponse(BaseModel):
    user_explanation: str
    technical_instruction: str
    confidence: float = Field(ge=0.0, le=1.0)
    metadata: AIMetadata = Field(default_factory=AIMetadata)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: AIResponseStatus = AIResponseStatus.SUCCESS

class AIPrompt(BaseModel):
    system_prompt: str
    user_input: str
    context: Dict[str, Any] = Field(default_factory=dict)
    project_history: List[Dict[str, Any]] = Field(default_factory=list)
    prompt_type: AIPromptType = AIPromptType.USER_EXPLANATION
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    project_id: str
    role: str = Field(..., description="user, ai_pm, or system")
    content: str
    ai_response: Optional[AIResponse] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    project_id: str
    title: str
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active")
    metadata: Dict[str, Any] = Field(default_factory=dict)

class VerificationRequest(BaseModel):
    original_request: str
    proposed_solution: AIResponse
    context: Dict[str, Any] = Field(default_factory=dict)
    verification_intensity: str = Field(default="moderate")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class VerificationResponse(BaseModel):
    verified: bool
    confidence: float = Field(ge=0.0, le=1.0)
    feedback: str
    additional_requirements: List[str] = Field(default_factory=list)
    suggested_improvements: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ContextAnalysis(BaseModel):
    project_id: str
    relevant_memories: List[Dict[str, Any]] = Field(default_factory=list)
    context_score: float = Field(ge=0.0, le=1.0)
    completeness_score: float = Field(ge=0.0, le=1.0)
    confidence_score: float = Field(ge=0.0, le=1.0)
    suggested_actions: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AIConfig(BaseModel):
    model_name: str = Field(default="gemini-2.0-flash-001")
    temperature: float = Field(default=0.3, ge=0.0, le=1.0)
    max_tokens: int = Field(default=2000, gt=0)
    confidence_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    verification_required: bool = Field(default=True)
    max_context_items: int = Field(default=10, gt=0)
    system_prompt_path: str = Field(default="app/prompts/ai_pm_system.txt")
    user_explanation_template: str = Field(default="app/prompts/user_explanation.txt")
    technical_instruction_template: str = Field(default="app/prompts/technical_instruction.txt")

class AIHealthStatus(BaseModel):
    healthy: bool
    model_configured: bool
    api_accessible: bool
    prompts_loaded: bool
    last_check: datetime = Field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None
    response_time: float = Field(default=0.0)

class AIPerformanceMetrics(BaseModel):
    total_requests: int = Field(default=0)
    successful_requests: int = Field(default=0)
    failed_requests: int = Field(default=0)
    average_response_time: float = Field(default=0.0)
    average_confidence: float = Field(default=0.0)
    verification_rate: float = Field(default=0.0)
    cache_hit_rate: float = Field(default=0.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MemoryContext(BaseModel):
    project_id: str
    context_type: str  # "error", "solution", "context", "dependency"
    key: str
    value: Any
    relevance_score: float = Field(ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ttl: Optional[int] = None

class ChatProcessingRequest(BaseModel):
    project_id: str
    user_message: str
    session_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    require_verification: bool = Field(default=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CreateSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    settings: Optional[Dict[str, Any]] = Field(default_factory=lambda: {
        "autoSave": True,
        "memoryContext": True,
        "aiAssistance": True,
        "allowInvites": False,
        "isPublic": False,
    })

class ChatProcessingResponse(BaseModel):
    success: bool
    ai_response: Optional[AIResponse] = None
    verification_required: bool = Field(default=False)
    verification_prompt: Optional[str] = None
    session_updated: bool = Field(default=False)
    message_stored: bool = Field(default=False)
    processing_time: float = Field(default=0.0)
    error_message: Optional[str] = None