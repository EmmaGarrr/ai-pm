from pydantic_settings import BaseSettings
from typing import Optional, List
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
    
    # WebSocket Configuration
    websocket_enabled: bool = True
    websocket_port: int = 8001
    websocket_host: str = "0.0.0.0"
    websocket_separate_server: bool = False
    websocket_cors_origins: str = "http://localhost:3000"
    websocket_heartbeat_interval: int = 25
    websocket_connection_timeout: int = 30
    websocket_max_connections: int = 1000
    websocket_connection_limit_per_ip: int = 10
    
    # Real-time Settings
    realtime_status_updates: bool = True
    realtime_memory_updates: bool = True
    realtime_chat_broadcasting: bool = True
    
    # Message Settings
    websocket_max_message_size: int = 1048576
    websocket_message_rate_limit: int = 100
    websocket_broadcast_queue_size: int = 1000
    
    # Security Settings
    websocket_enable_authentication: bool = True
    websocket_auth_timeout: int = 10
    websocket_session_timeout: int = 3600
    
    # Reconnection Settings
    websocket_enable_auto_reconnect: bool = True
    websocket_max_reconnect_attempts: int = 5
    websocket_reconnect_delay: int = 1
    websocket_reconnect_backoff_multiplier: float = 2.0
    
    # Logging and Monitoring
    websocket_enable_connection_logging: bool = True
    websocket_enable_message_logging: bool = False
    websocket_enable_metrics_collection: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()