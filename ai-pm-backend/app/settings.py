from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Redis Configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # API Configuration
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    cors_origins: str = "http://localhost:3000"
    
    # Environment
    environment: str = "development"
    log_level: str = "INFO"
    
    # System Configuration
    max_memory_items: int = 1000
    context_window_size: int = 10
    confidence_threshold: float = 0.85
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()