import secrets
import hashlib
import hmac
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging
import re
from ..utils.logger import get_logger

logger = get_logger(__name__)

class WebSocketAuthenticator:
    """WebSocket authentication and security manager"""
    
    def __init__(self):
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.session_tokens: Dict[str, Dict[str, Any]] = {}
        self.rate_limiting: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        self.max_sessions_per_user = 5
        self.session_timeout = 3600  # 1 hour
        self.rate_limit_requests = 100  # requests per minute
        self.max_failed_attempts = 5
        self.failed_attempts: Dict[str, int] = {}
        
        # Security patterns
        self.allowed_origins = []
        self.allowed_message_types = [
            "authenticate", "message", "heartbeat", "join_project", 
            "leave_project", "ping", "pong", "subscribe", "unsubscribe"
        ]
        
        logger.info("WebSocketAuthenticator initialized")
    
    def generate_api_key(self, user_id: str, project_ids: List[str] = None) -> Dict[str, str]:
        """Generate API key for user"""
        api_key = f"sk_{secrets.token_urlsafe(32)}"
        api_secret = secrets.token_urlsafe(64)
        
        # Store API key info
        self.api_keys[api_key] = {
            "user_id": user_id,
            "api_secret": api_secret,
            "project_ids": project_ids or [],
            "created_at": datetime.utcnow(),
            "last_used": None,
            "is_active": True,
            "rate_limit": self.rate_limit_requests
        }
        
        logger.info(f"Generated API key for user {user_id}")
        
        return {
            "api_key": api_key,
            "api_secret": api_secret,
            "user_id": user_id
        }
    
    def validate_api_key(self, api_key: str, api_secret: str) -> Optional[Dict[str, Any]]:
        """Validate API key and secret"""
        key_info = self.api_keys.get(api_key)
        
        if not key_info:
            logger.warning(f"Invalid API key: {api_key[:8]}...")
            return None
        
        if not key_info["is_active"]:
            logger.warning(f"Inactive API key: {api_key[:8]}...")
            return None
        
        if key_info["api_secret"] != api_secret:
            logger.warning(f"Invalid API secret for key: {api_key[:8]}...")
            return None
        
        # Update last used timestamp
        key_info["last_used"] = datetime.utcnow()
        
        return {
            "user_id": key_info["user_id"],
            "project_ids": key_info["project_ids"],
            "api_key": api_key
        }
    
    def generate_session_token(self, user_id: str, connection_id: str, project_id: str = None) -> str:
        """Generate session token for WebSocket connection"""
        session_token = f"sess_{secrets.token_urlsafe(32)}"
        
        # Check session limit
        user_sessions = [s for s in self.session_tokens.values() if s["user_id"] == user_id]
        if len(user_sessions) >= self.max_sessions_per_user:
            # Remove oldest session
            oldest_session = min(user_sessions, key=lambda x: x["created_at"])
            self.session_tokens.pop(oldest_session["token"], None)
            logger.info(f"Removed oldest session for user {user_id} due to limit")
        
        # Store session token
        self.session_tokens[session_token] = {
            "token": session_token,
            "user_id": user_id,
            "connection_id": connection_id,
            "project_id": project_id,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "is_active": True,
            "permissions": self._get_user_permissions(user_id)
        }
        
        logger.info(f"Generated session token for user {user_id}")
        return session_token
    
    def validate_session_token(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate session token"""
        session_info = self.session_tokens.get(session_token)
        
        if not session_info:
            logger.warning(f"Invalid session token: {session_token[:16]}...")
            return None
        
        if not session_info["is_active"]:
            logger.warning(f"Inactive session token: {session_token[:16]}...")
            return None
        
        # Check session timeout
        time_since_activity = (datetime.utcnow() - session_info["last_activity"]).total_seconds()
        if time_since_activity > self.session_timeout:
            self.session_tokens.pop(session_token, None)
            logger.warning(f"Session token expired: {session_token[:16]}...")
            return None
        
        # Update last activity
        session_info["last_activity"] = datetime.utcnow()
        
        return session_info
    
    def invalidate_session_token(self, session_token: str):
        """Invalidate session token"""
        if session_token in self.session_tokens:
            session_info = self.session_tokens[session_token]
            session_info["is_active"] = False
            self.session_tokens.pop(session_token, None)
            logger.info(f"Invalidated session token for user {session_info['user_id']}")
    
    def check_rate_limit(self, identifier: str) -> bool:
        """Check if identifier exceeds rate limit"""
        now = time.time()
        minute_ago = now - 60
        
        # Clean old entries
        if identifier in self.rate_limiting:
            self.rate_limiting[identifier] = [
                timestamp for timestamp in self.rate_limiting[identifier]
                if timestamp > minute_ago
            ]
        else:
            self.rate_limiting[identifier] = []
        
        # Check current count
        current_count = len(self.rate_limiting[identifier])
        if current_count >= self.rate_limit_requests:
            logger.warning(f"Rate limit exceeded for {identifier}")
            return False
        
        # Add current request
        self.rate_limiting[identifier].append(now)
        return True
    
    def check_ip_reputation(self, ip_address: str) -> bool:
        """Check if IP address is blocked or suspicious"""
        # Check if IP is blocked
        if ip_address in self.blocked_ips:
            block_time = self.blocked_ips[ip_address]
            if datetime.utcnow() < block_time:
                logger.warning(f"Blocked IP address: {ip_address}")
                return False
            else:
                # Remove expired block
                del self.blocked_ips[ip_address]
        
        # Check for suspicious patterns (simplified)
        suspicious_patterns = [
            r'^192\.168\.1\.\d+$',  # Example LAN pattern
        ]
        
        for pattern in suspicious_patterns:
            if re.match(pattern, ip_address):
                logger.warning(f"Suspicious IP pattern: {ip_address}")
                return False
        
        return True
    
    def block_ip_address(self, ip_address: str, duration_minutes: int = 60):
        """Block IP address for specified duration"""
        block_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.blocked_ips[ip_address] = block_until
        logger.warning(f"Blocked IP address {ip_address} until {block_until}")
    
    def record_failed_attempt(self, identifier: str):
        """Record failed authentication attempt"""
        self.failed_attempts[identifier] = self.failed_attempts.get(identifier, 0) + 1
        
        if self.failed_attempts[identifier] >= self.max_failed_attempts:
            # Block for 15 minutes
            self.block_ip_address(identifier, 15)
            logger.warning(f"Max failed attempts reached for {identifier}")
    
    def reset_failed_attempts(self, identifier: str):
        """Reset failed attempts for identifier"""
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]
    
    def validate_message_format(self, message: Dict[str, Any]) -> bool:
        """Validate WebSocket message format"""
        if not isinstance(message, dict):
            return False
        
        # Check required fields
        if "type" not in message:
            return False
        
        # Check message type
        if message["type"] not in self.allowed_message_types:
            logger.warning(f"Invalid message type: {message['type']}")
            return False
        
        # Check for malicious content
        if "data" in message and isinstance(message["data"], dict):
            if self._contains_malicious_content(message["data"]):
                logger.warning("Malicious content detected in message")
                return False
        
        return True
    
    def _contains_malicious_content(self, data: Dict[str, Any]) -> bool:
        """Check for malicious content in message data"""
        malicious_patterns = [
            r"<script[^>]*>.*?</script>",  # XSS attempts
            r"javascript:",  # JavaScript protocol
            r"eval\s*\(",  # eval() function
            r"document\.",  # Document object access
            r"window\.",  # Window object access
            r"<iframe[^>]*>",  # iframe tags
            r"<object[^>]*>",  # object tags
            r"<embed[^>]*>",  # embed tags
        ]
        
        # Convert data to string for checking
        data_str = str(data).lower()
        
        for pattern in malicious_patterns:
            if re.search(pattern, data_str, re.IGNORECASE):
                return True
        
        return False
    
    def _get_user_permissions(self, user_id: str) -> List[str]:
        """Get user permissions (simplified)"""
        # In a real implementation, this would query a database
        return [
            "read:messages",
            "write:messages",
            "join:projects",
            "leave:projects",
            "subscribe:events"
        ]
    
    def check_permission(self, session_info: Dict[str, Any], permission: str) -> bool:
        """Check if session has required permission"""
        user_permissions = session_info.get("permissions", [])
        return permission in user_permissions
    
    def sanitize_message_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize message data to prevent XSS and other attacks"""
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                # Remove HTML tags and escape special characters
                sanitized[key] = re.sub(r'<[^>]*>', '', value)
                sanitized[key] = sanitized[key].replace('&', '&amp;')
                sanitized[key] = sanitized[key].replace('<', '&lt;')
                sanitized[key] = sanitized[key].replace('>', '&gt;')
                sanitized[key] = sanitized[key].replace('"', '&quot;')
                sanitized[key] = sanitized[key].replace("'", '&#x27;')
            elif isinstance(value, dict):
                sanitized[key] = self.sanitize_message_data(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        current_time = datetime.utcnow()
        expired_tokens = []
        
        for token, session_info in self.session_tokens.items():
            time_since_activity = (current_time - session_info["last_activity"]).total_seconds()
            if time_since_activity > self.session_timeout:
                expired_tokens.append(token)
        
        for token in expired_tokens:
            self.session_tokens.pop(token, None)
            logger.info(f"Cleaned up expired session: {token[:16]}...")
    
    def get_security_stats(self) -> Dict[str, Any]:
        """Get security statistics"""
        return {
            "active_sessions": len(self.session_tokens),
            "active_api_keys": len([k for k, v in self.api_keys.items() if v["is_active"]]),
            "blocked_ips": len(self.blocked_ips),
            "failed_attempts": dict(self.failed_attempts),
            "rate_limit_active": len(self.rate_limiting),
            "session_timeout": self.session_timeout,
            "rate_limit_requests": self.rate_limit_requests
        }
    
    def validate_origin(self, origin: str) -> bool:
        """Validate WebSocket origin"""
        if not self.allowed_origins:
            return True  # Allow all if no restrictions
        
        return origin in self.allowed_origins
    
    def set_allowed_origins(self, origins: List[str]):
        """Set allowed WebSocket origins"""
        self.allowed_origins = origins
        logger.info(f"Updated allowed origins: {origins}")

class WebSocketSecurityMiddleware:
    """Security middleware for WebSocket connections"""
    
    def __init__(self, authenticator: WebSocketAuthenticator):
        self.authenticator = authenticator
    
    async def authenticate_connection(self, connection_id: str, auth_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Authenticate WebSocket connection"""
        try:
            auth_method = auth_data.get("method")
            
            if auth_method == "api_key":
                api_key = auth_data.get("api_key")
                api_secret = auth_data.get("api_secret")
                
                if not api_key or not api_secret:
                    logger.warning("Missing API key or secret")
                    return None
                
                return self.authenticator.validate_api_key(api_key, api_secret)
            
            elif auth_method == "session_token":
                session_token = auth_data.get("session_token")
                
                if not session_token:
                    logger.warning("Missing session token")
                    return None
                
                return self.authenticator.validate_session_token(session_token)
            
            else:
                logger.warning(f"Unknown authentication method: {auth_method}")
                return None
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    async def authorize_message(self, session_info: Dict[str, Any], message: Dict[str, Any]) -> bool:
        """Authorize message based on session permissions"""
        try:
            message_type = message.get("type")
            
            # Check basic message format
            if not self.authenticator.validate_message_format(message):
                return False
            
            # Check permissions based on message type
            if message_type in ["join_project", "leave_project"]:
                return self.authenticator.check_permission(session_info, "join:projects")
            elif message_type in ["message"]:
                return self.authenticator.check_permission(session_info, "write:messages")
            elif message_type in ["subscribe", "unsubscribe"]:
                return self.authenticator.check_permission(session_info, "subscribe:events")
            
            return True
            
        except Exception as e:
            logger.error(f"Authorization error: {e}")
            return False
    
    def sanitize_outgoing_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize outgoing message"""
        if "data" in message:
            message["data"] = self.authenticator.sanitize_message_data(message["data"])
        return message

# Global authenticator instance
authenticator = WebSocketAuthenticator()
security_middleware = WebSocketSecurityMiddleware(authenticator)

def get_authenticator() -> WebSocketAuthenticator:
    """Get authenticator instance"""
    return authenticator

def get_security_middleware() -> WebSocketSecurityMiddleware:
    """Get security middleware instance"""
    return security_middleware