import asyncio
import json
import logging
import traceback
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from ..utils.logger import get_logger

logger = get_logger(__name__)

class ErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """Error categories"""
    WEBSOCKET = "websocket"
    REDIS = "redis"
    AI_SERVICE = "ai_service"
    CONTEXT_ENGINE = "context_engine"
    BROADCAST = "broadcast"
    AUTHENTICATION = "authentication"
    VALIDATION = "validation"
    SYSTEM = "system"

@dataclass
class ErrorInfo:
    """Error information structure"""
    error_id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    message: str
    details: Dict[str, Any]
    stack_trace: Optional[str] = None
    recovery_action: Optional[str] = None
    resolved: bool = False
    resolution_time: Optional[datetime] = None

class RecoveryStrategy(Enum):
    """Recovery strategies"""
    RETRY = "retry"
    FALLBACK = "fallback"
    CIRCUIT_BREAKER = "circuit_breaker"
    DEGRADE_SERVICE = "degrade_service"
    NOTIFICATION_ONLY = "notification_only"

class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"         # Service unavailable
    HALF_OPEN = "half_open"  # Testing service availability

class CircuitBreaker:
    """Circuit breaker implementation for service protection"""
    
    def __init__(self, 
                 failure_threshold: int = 5,
                 recovery_timeout: int = 60,
                 expected_exception: type = Exception):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.success_count = 0
        
    def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == CircuitBreakerState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitBreakerState.HALF_OPEN
                self.success_count = 0
            else:
                raise Exception(f"Circuit breaker is OPEN for {func.__name__}")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = (datetime.utcnow() - self.last_failure_time).total_seconds()
        return time_since_failure >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful call"""
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= 3:  # Require 3 consecutive successes
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
        
        self.failure_count = 0
        self.last_failure_time = None
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
    
    def get_state(self) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "success_count": self.success_count
        }

class ErrorHandler:
    """Comprehensive error handling and recovery system"""
    
    def __init__(self):
        self.error_history: List[ErrorInfo] = []
        self.max_history_size = 1000
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.recovery_strategies: Dict[ErrorCategory, RecoveryStrategy] = {}
        self.error_callbacks: Dict[str, List[Callable]] = {}
        
        # Initialize default recovery strategies
        self._initialize_recovery_strategies()
        
        # Initialize circuit breakers for critical services
        self._initialize_circuit_breakers()
        
        logger.info("ErrorHandler initialized")
    
    def _initialize_recovery_strategies(self):
        """Initialize default recovery strategies for different error categories"""
        self.recovery_strategies = {
            ErrorCategory.WEBSOCKET: RecoveryStrategy.RETRY,
            ErrorCategory.REDIS: RecoveryStrategy.FALLBACK,
            ErrorCategory.AI_SERVICE: RecoveryStrategy.CIRCUIT_BREAKER,
            ErrorCategory.CONTEXT_ENGINE: RecoveryStrategy.DEGRADE_SERVICE,
            ErrorCategory.BROADCAST: RecoveryStrategy.FALLBACK,
            ErrorCategory.AUTHENTICATION: RecoveryStrategy.NOTIFICATION_ONLY,
            ErrorCategory.VALIDATION: RecoveryStrategy.NOTIFICATION_ONLY,
            ErrorCategory.SYSTEM: RecoveryStrategy.NOTIFICATION_ONLY
        }
    
    def _initialize_circuit_breakers(self):
        """Initialize circuit breakers for critical services"""
        self.circuit_breakers = {
            "ai_service": CircuitBreaker(failure_threshold=3, recovery_timeout=30),
            "redis_service": CircuitBreaker(failure_threshold=5, recovery_timeout=60),
            "websocket_service": CircuitBreaker(failure_threshold=10, recovery_timeout=15),
            "broadcast_service": CircuitBreaker(failure_threshold=5, recovery_timeout=30)
        }
    
    async def handle_error(self, 
                         error: Exception,
                         category: ErrorCategory,
                         severity: ErrorSeverity,
                         context: Dict[str, Any] = None,
                         service_name: str = None) -> ErrorInfo:
        """Handle an error with appropriate recovery strategy"""
        
        # Generate error ID
        error_id = f"err_{datetime.utcnow().timestamp()}_{hash(str(error))}"
        
        # Create error info
        error_info = ErrorInfo(
            error_id=error_id,
            timestamp=datetime.utcnow(),
            severity=severity,
            category=category,
            message=str(error),
            details=context or {},
            stack_trace=traceback.format_exc(),
            recovery_action=self._get_recovery_action(category, error)
        )
        
        # Store error in history
        self._store_error(error_info)
        
        # Log error
        self._log_error(error_info)
        
        # Execute recovery strategy
        await self._execute_recovery_strategy(error_info, service_name)
        
        # Notify callbacks
        await self._notify_callbacks(error_info)
        
        return error_info
    
    def _get_recovery_action(self, category: ErrorCategory, error: Exception) -> str:
        """Get appropriate recovery action for error"""
        recovery_strategy = self.recovery_strategies.get(category, RecoveryStrategy.NOTIFICATION_ONLY)
        
        actions = {
            RecoveryStrategy.RETRY: "Retry operation with exponential backoff",
            RecoveryStrategy.FALLBACK: "Use fallback service or cached data",
            RecoveryStrategy.CIRCUIT_BREAKER: "Temporarily disable service via circuit breaker",
            RecoveryStrategy.DEGRADE_SERVICE: "Degrade service functionality gracefully",
            RecoveryStrategy.NOTIFICATION_ONLY: "Log error and notify administrators"
        }
        
        return actions.get(recovery_strategy, "No specific recovery action")
    
    async def _execute_recovery_strategy(self, error_info: ErrorInfo, service_name: str = None):
        """Execute recovery strategy for the error"""
        strategy = self.recovery_strategies.get(error_info.category, RecoveryStrategy.NOTIFICATION_ONLY)
        
        try:
            if strategy == RecoveryStrategy.CIRCUIT_BREAKER and service_name:
                # Update circuit breaker state
                circuit_breaker = self.circuit_breakers.get(service_name)
                if circuit_breaker:
                    circuit_breaker.failure_count += 1
                    circuit_breaker.last_failure_time = datetime.utcnow()
                    
                    if circuit_breaker.failure_count >= circuit_breaker.failure_threshold:
                        circuit_breaker.state = CircuitBreakerState.OPEN
                        logger.warning(f"Circuit breaker OPENED for service: {service_name}")
            
            elif strategy == RecoveryStrategy.DEGRADE_SERVICE:
                # Implement service degradation logic
                await self._degrade_service(error_info.category)
            
            elif strategy == RecoveryStrategy.RETRY:
                # Implement retry logic with exponential backoff
                await self._retry_operation(error_info)
            
            elif strategy == RecoveryStrategy.FALLBACK:
                # Implement fallback logic
                await self._use_fallback(error_info.category)
            
        except Exception as e:
            logger.error(f"Error executing recovery strategy: {e}")
    
    async def _degrade_service(self, category: ErrorCategory):
        """Degrade service functionality"""
        logger.info(f"Degrading service for category: {category.value}")
        
        # Implement service-specific degradation
        if category == ErrorCategory.CONTEXT_ENGINE:
            # Use simplified context analysis
            pass
        elif category == ErrorCategory.BROADCAST:
            # Store messages for later delivery
            pass
    
    async def _retry_operation(self, error_info: ErrorInfo):
        """Retry operation with exponential backoff"""
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            delay = base_delay * (2 ** attempt)
            
            try:
                await asyncio.sleep(delay)
                # In a real implementation, you would retry the original operation
                logger.info(f"Retry attempt {attempt + 1} for error {error_info.error_id}")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Max retries exceeded for error {error_info.error_id}")
                continue
    
    async def _use_fallback(self, category: ErrorCategory):
        """Use fallback service or cached data"""
        logger.info(f"Using fallback for category: {category.value}")
        
        # Implement fallback logic
        if category == ErrorCategory.REDIS:
            # Use in-memory cache or local storage
            pass
        elif category == ErrorCategory.BROADCAST:
            # Store messages for later delivery
            pass
    
    def _store_error(self, error_info: ErrorInfo):
        """Store error in history"""
        self.error_history.append(error_info)
        
        # Maintain history size
        if len(self.error_history) > self.max_history_size:
            self.error_history = self.error_history[-self.max_history_size:]
    
    def _log_error(self, error_info: ErrorInfo):
        """Log error with appropriate level"""
        log_message = f"[{error_info.category.value}] {error_info.message}"
        
        if error_info.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra={"error_id": error_info.error_id})
        elif error_info.severity == ErrorSeverity.HIGH:
            logger.error(log_message, extra={"error_id": error_info.error_id})
        elif error_info.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message, extra={"error_id": error_info.error_id})
        else:
            logger.info(log_message, extra={"error_id": error_info.error_id})
    
    async def _notify_callbacks(self, error_info: ErrorInfo):
        """Notify registered callbacks"""
        callbacks = self.error_callbacks.get(error_info.category.value, [])
        
        for callback in callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(error_info)
                else:
                    callback(error_info)
            except Exception as e:
                logger.error(f"Error in error callback: {e}")
    
    def register_callback(self, category: ErrorCategory, callback: Callable):
        """Register callback for error category"""
        category_key = category.value
        if category_key not in self.error_callbacks:
            self.error_callbacks[category_key] = []
        
        self.error_callbacks[category_key].append(callback)
        logger.info(f"Registered callback for {category_key} errors")
    
    def get_circuit_breaker_state(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get circuit breaker state for service"""
        circuit_breaker = self.circuit_breakers.get(service_name)
        if circuit_breaker:
            return circuit_breaker.get_state()
        return None
    
    def reset_circuit_breaker(self, service_name: str):
        """Reset circuit breaker for service"""
        circuit_breaker = self.circuit_breakers.get(service_name)
        if circuit_breaker:
            circuit_breaker.state = CircuitBreakerState.CLOSED
            circuit_breaker.failure_count = 0
            circuit_breaker.success_count = 0
            circuit_breaker.last_failure_time = None
            logger.info(f"Reset circuit breaker for service: {service_name}")
    
    def get_error_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get error statistics for specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        recent_errors = [
            error for error in self.error_history
            if error.timestamp > cutoff_time
        ]
        
        # Group by category
        category_counts = {}
        severity_counts = {}
        
        for error in recent_errors:
            category_counts[error.category.value] = category_counts.get(error.category.value, 0) + 1
            severity_counts[error.severity.value] = severity_counts.get(error.severity.value, 0) + 1
        
        # Calculate resolution rate
        resolved_errors = [error for error in recent_errors if error.resolved]
        resolution_rate = len(resolved_errors) / len(recent_errors) if recent_errors else 0
        
        return {
            "total_errors": len(recent_errors),
            "category_distribution": category_counts,
            "severity_distribution": severity_counts,
            "resolution_rate": resolution_rate,
            "time_range_hours": hours,
            "circuit_breakers": {
                name: cb.get_state() for name, cb in self.circuit_breakers.items()
            }
        }
    
    def resolve_error(self, error_id: str):
        """Mark an error as resolved"""
        for error in self.error_history:
            if error.error_id == error_id:
                error.resolved = True
                error.resolution_time = datetime.utcnow()
                logger.info(f"Error resolved: {error_id}")
                break

# Global error handler instance
error_handler = ErrorHandler()

def get_error_handler() -> ErrorHandler:
    """Get error handler instance"""
    return error_handler

def handle_websocket_error(func):
    """Decorator for WebSocket error handling"""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            await error_handler.handle_error(
                error=e,
                category=ErrorCategory.WEBSOCKET,
                severity=ErrorSeverity.HIGH,
                context={"function": func.__name__, "args": str(args), "kwargs": str(kwargs)},
                service_name="websocket_service"
            )
            raise
    return wrapper

def handle_redis_error(func):
    """Decorator for Redis error handling"""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            await error_handler.handle_error(
                error=e,
                category=ErrorCategory.REDIS,
                severity=ErrorSeverity.MEDIUM,
                context={"function": func.__name__, "args": str(args), "kwargs": str(kwargs)},
                service_name="redis_service"
            )
            raise
    return wrapper

def handle_ai_service_error(func):
    """Decorator for AI service error handling"""
    async def wrapper(*args, **kwargs):
        circuit_breaker = error_handler.circuit_breakers.get("ai_service")
        if circuit_breaker:
            return circuit_breaker.call(func, *args, **kwargs)
        else:
            return await func(*args, **kwargs)
    return wrapper