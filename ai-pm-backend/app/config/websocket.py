from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os

class WebSocketSettings(BaseSettings):
    """WebSocket configuration settings"""
    
    model_config = {
        "env_prefix": "WEBSOCKET_",
        "extra": "ignore",
        "env_file": None,
        "env_file_encoding": "utf-8",
        "case_sensitive": False
    }
    
    # Basic WebSocket Configuration
    enabled: bool = Field(default=True, env="WEBSOCKET_ENABLED")
    port: int = Field(default=8001, env="WEBSOCKET_PORT")
    host: str = Field(default="0.0.0.0", env="WEBSOCKET_HOST")
    separate_server: bool = Field(default=False, env="WEBSOCKET_SEPARATE_SERVER")
    
    # CORS Configuration
    cors_origins: str = Field(default="http://localhost:3000", env="WEBSOCKET_CORS_ORIGINS")
    cors_allow_credentials: bool = Field(default=True, env="WEBSOCKET_CORS_ALLOW_CREDENTIALS")
    cors_allow_methods: List[str] = Field(default=["*"], env="WEBSOCKET_CORS_ALLOW_METHODS")
    cors_allow_headers: List[str] = Field(default=["*"], env="WEBSOCKET_CORS_ALLOW_HEADERS")
    
    # Connection Management
    heartbeat_interval: int = Field(default=25, env="WEBSOCKET_HEARTBEAT_INTERVAL")  # seconds
    connection_timeout: int = Field(default=30, env="WEBSOCKET_CONNECTION_TIMEOUT")  # seconds
    max_connections: int = Field(default=1000, env="WEBSOCKET_MAX_CONNECTIONS")
    connection_limit_per_ip: int = Field(default=10, env="WEBSOCKET_CONNECTION_LIMIT_PER_IP")
    
    # Real-time Features
    realtime_status_updates: bool = Field(default=True, env="REALTIME_STATUS_UPDATES")
    realtime_memory_updates: bool = Field(default=True, env="REALTIME_MEMORY_UPDATES")
    realtime_chat_broadcasting: bool = Field(default=True, env="REALTIME_CHAT_BROADCASTING")
    
    # Message Settings
    max_message_size: int = Field(default=1024 * 1024, env="WEBSOCKET_MAX_MESSAGE_SIZE")  # 1MB
    message_rate_limit: int = Field(default=100, env="WEBSOCKET_MESSAGE_RATE_LIMIT")  # messages per minute
    broadcast_queue_size: int = Field(default=1000, env="WEBSOCKET_BROADCAST_QUEUE_SIZE")
    
    # Security Settings
    enable_authentication: bool = Field(default=True, env="WEBSOCKET_ENABLE_AUTHENTICATION")
    auth_timeout: int = Field(default=10, env="WEBSOCKET_AUTH_TIMEOUT")  # seconds
    session_timeout: int = Field(default=3600, env="WEBSOCKET_SESSION_TIMEOUT")  # 1 hour
    
    # Reconnection Settings
    enable_auto_reconnect: bool = Field(default=True, env="WEBSOCKET_ENABLE_AUTO_RECONNECT")
    max_reconnect_attempts: int = Field(default=5, env="WEBSOCKET_MAX_RECONNECT_ATTEMPTS")
    reconnect_delay: int = Field(default=1, env="WEBSOCKET_RECONNECT_DELAY")  # seconds
    reconnect_backoff_multiplier: float = Field(default=2.0, env="WEBSOCKET_RECONNECT_BACKOFF_MULTIPLIER")
    
    # Logging and Monitoring
    enable_connection_logging: bool = Field(default=True, env="WEBSOCKET_ENABLE_CONNECTION_LOGGING")
    enable_message_logging: bool = Field(default=False, env="WEBSOCKET_ENABLE_MESSAGE_LOGGING")
    enable_metrics_collection: bool = Field(default=True, env="WEBSOCKET_ENABLE_METRICS_COLLECTION")
    
    # Performance Settings
    enable_compression: bool = Field(default=True, env="WEBSOCKET_ENABLE_COMPRESSION")
    worker_processes: int = Field(default=1, env="WEBSOCKET_WORKER_PROCESSES")
    
        
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list"""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    
    @property
    def is_enabled(self) -> bool:
        """Check if WebSocket is enabled"""
        return self.enabled
    
    @property
    def server_url(self) -> str:
        """Get WebSocket server URL"""
        return f"ws://{self.host}:{self.port}"
    
    @property
    def http_server_url(self) -> str:
        """Get HTTP server URL for health checks"""
        return f"http://{self.host}:{self.port}"
    
    def get_reconnect_delay(self, attempt: int) -> int:
        """Calculate reconnect delay with exponential backoff"""
        if not self.enable_auto_reconnect:
            return 0
        
        if attempt >= self.max_reconnect_attempts:
            return 0
        
        delay = self.reconnect_delay * (self.reconnect_backoff_multiplier ** attempt)
        return min(delay, 60)  # Cap at 60 seconds
    
    def validate_settings(self) -> List[str]:
        """Validate WebSocket settings and return list of issues"""
        issues = []
        
        if self.port < 1 or self.port > 65535:
            issues.append("WebSocket port must be between 1 and 65535")
        
        if self.heartbeat_interval < 1 or self.heartbeat_interval > 300:
            issues.append("Heartbeat interval must be between 1 and 300 seconds")
        
        if self.connection_timeout < 5 or self.connection_timeout > 300:
            issues.append("Connection timeout must be between 5 and 300 seconds")
        
        if self.max_connections < 1 or self.max_connections > 10000:
            issues.append("Max connections must be between 1 and 10000")
        
        if self.max_message_size < 1024 or self.max_message_size > 10 * 1024 * 1024:
            issues.append("Max message size must be between 1KB and 10MB")
        
        if self.message_rate_limit < 1 or self.message_rate_limit > 1000:
            issues.append("Message rate limit must be between 1 and 1000 messages per minute")
        
        return issues

def get_websocket_settings() -> WebSocketSettings:
    """Get WebSocket settings instance"""
    return WebSocketSettings(_env_file=None)