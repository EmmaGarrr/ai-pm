from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from ..utils.logger import get_logger

logger = get_logger(__name__)

class BaseService(ABC):
    """Base class for all services with common functionality"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.service_name = self.__class__.__name__
        self.created_at = datetime.utcnow()
        
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the service"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if service is healthy"""
        pass
    
    async def cleanup(self) -> bool:
        """Cleanup resources - override if needed"""
        return True
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get service information"""
        return {
            "service_name": self.service_name,
            "config": self.config,
            "created_at": self.created_at.isoformat(),
            "uptime": (datetime.utcnow() - self.created_at).total_seconds()
        }
    
    def log_info(self, message: str, **kwargs):
        """Log info message with service context"""
        logger.info(f"[{self.service_name}] {message}", **kwargs)
    
    def log_error(self, message: str, **kwargs):
        """Log error message with service context"""
        logger.error(f"[{self.service_name}] {message}", **kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message with service context"""
        logger.warning(f"[{self.service_name}] {message}", **kwargs)