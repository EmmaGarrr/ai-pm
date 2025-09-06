import asyncio
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
from ..services.websocket_service import get_websocket_service
from ..services.redis_service import RedisService
from ..events.websocket_events import WebSocketEvents
from ..utils.logger import get_logger

logger = get_logger(__name__)

class SystemStatus:
    """System status information"""
    
    def __init__(self):
        self.healthy = True
        self.last_check = datetime.utcnow()
        self.components = {
            "redis": True,
            "websocket": True,
            "ai_service": True,
            "chat_processor": True,
            "context_engine": True
        }
        self.metrics = {
            "uptime": 0,
            "memory_usage": 0,
            "cpu_usage": 0,
            "active_connections": 0,
            "messages_processed": 0,
            "error_rate": 0.0
        }
        self.alerts: List[Dict[str, Any]] = []
    
    def update_component_status(self, component: str, healthy: bool):
        """Update component health status"""
        self.components[component] = healthy
        self.last_check = datetime.utcnow()
        
        # Log status change
        if not healthy:
            self.add_alert({
                "type": "component_failure",
                "component": component,
                "message": f"Component {component} is unhealthy",
                "severity": "high",
                "timestamp": datetime.utcnow().isoformat()
            })
    
    def add_alert(self, alert: Dict[str, Any]):
        """Add system alert"""
        alert["timestamp"] = datetime.utcnow().isoformat()
        self.alerts.append(alert)
        
        # Keep only recent alerts (last 100)
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary"""
        healthy_components = sum(1 for status in self.components.values() if status)
        total_components = len(self.components)
        
        return {
            "healthy": self.healthy and healthy_components == total_components,
            "component_health": self.components.copy(),
            "healthy_components": healthy_components,
            "total_components": total_components,
            "health_percentage": (healthy_components / total_components) * 100,
            "last_check": self.last_check.isoformat(),
            "active_alerts": len([a for a in self.alerts if a.get("severity") == "high"]),
            "total_alerts": len(self.alerts)
        }

class StatusService:
    """Real-time status monitoring and broadcasting service"""
    
    def __init__(self, check_interval: int = 30):
        self.check_interval = check_interval
        self.system_status = SystemStatus()
        self.status_history: deque = deque(maxlen=1000)
        
        # Performance metrics
        self.response_times: deque = deque(maxlen=100)
        self.error_counts: deque = deque(maxlen=100)
        self.connection_counts: deque = deque(maxlen=100)
        
        # Background tasks
        self.health_check_task: Optional[asyncio.Task] = None
        self.metrics_collection_task: Optional[asyncio.Task] = None
        self.status_broadcast_task: Optional[asyncio.Task] = None
        
        # Redis service for health checks
        self.redis_service: Optional[RedisService] = None
        
        # Thresholds for alerts
        self.thresholds = {
            "response_time_warning": 5.0,  # seconds
            "response_time_critical": 10.0,
            "error_rate_warning": 0.05,  # 5%
            "error_rate_critical": 0.10,  # 10%
            "memory_usage_warning": 0.80,  # 80%
            "memory_usage_critical": 0.90,  # 90%
            "connection_count_warning": 500,
            "connection_count_critical": 800
        }
        
        logger.info("StatusService initialized")
    
    async def start(self):
        """Start status monitoring background tasks"""
        self.health_check_task = asyncio.create_task(self._health_check_loop())
        self.metrics_collection_task = asyncio.create_task(self._metrics_collection_loop())
        self.status_broadcast_task = asyncio.create_task(self._status_broadcast_loop())
        
        # Initialize Redis service
        self.redis_service = RedisService()
        await self.redis_service.connect()
        
        logger.info("StatusService background tasks started")
    
    async def stop(self):
        """Stop status monitoring background tasks"""
        if self.health_check_task:
            self.health_check_task.cancel()
        if self.metrics_collection_task:
            self.metrics_collection_task.cancel()
        if self.status_broadcast_task:
            self.status_broadcast_task.cancel()
        
        if self.redis_service:
            await self.redis_service.close()
        
        logger.info("StatusService background tasks stopped")
    
    async def _health_check_loop(self):
        """Main health check loop"""
        while True:
            try:
                await asyncio.sleep(self.check_interval)
                await self._perform_health_checks()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(5)
    
    async def _perform_health_checks(self):
        """Perform comprehensive health checks"""
        start_time = datetime.utcnow()
        
        try:
            # Check Redis health
            redis_healthy = await self._check_redis_health()
            self.system_status.update_component_status("redis", redis_healthy)
            
            # Check WebSocket service health
            websocket_healthy = await self._check_websocket_health()
            self.system_status.update_component_status("websocket", websocket_healthy)
            
            # Update overall system health
            all_healthy = all(self.system_status.components.values())
            self.system_status.healthy = all_healthy
            
            # Record health check
            check_duration = (datetime.utcnow() - start_time).total_seconds()
            self.response_times.append(check_duration)
            
            # Log health status
            if not all_healthy:
                logger.warning(f"System health check failed: {self.system_status.components}")
            
            # Add to status history
            self.status_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "healthy": all_healthy,
                "components": self.system_status.components.copy(),
                "check_duration": check_duration
            })
            
        except Exception as e:
            logger.error(f"Error performing health checks: {e}")
            self.system_status.update_component_status("system", False)
    
    async def _check_redis_health(self) -> bool:
        """Check Redis health"""
        try:
            if not self.redis_service:
                return False
            
            return await self.redis_service.health_check()
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    async def _check_websocket_health(self) -> bool:
        """Check WebSocket service health"""
        try:
            websocket_service = get_websocket_service()
            stats = websocket_service.get_statistics()
            
            # Check if WebSocket service is responding
            return stats["service"]["uptime"] > 0
            
        except Exception as e:
            logger.error(f"WebSocket health check failed: {e}")
            return False
    
    async def _metrics_collection_loop(self):
        """Collect system metrics"""
        while True:
            try:
                await asyncio.sleep(10)  # Collect metrics every 10 seconds
                await self._collect_metrics()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics collection: {e}")
                await asyncio.sleep(5)
    
    async def _collect_metrics(self):
        """Collect system performance metrics"""
        try:
            # Get WebSocket service metrics
            websocket_service = get_websocket_service()
            websocket_stats = websocket_service.get_statistics()
            
            # Update connection count
            active_connections = websocket_stats["connections"]["active_connections"]
            self.connection_counts.append(active_connections)
            
            # Calculate error rate
            total_messages = (websocket_stats["service"]["messages_sent"] + 
                             websocket_stats["service"]["messages_received"])
            error_count = websocket_stats["service"]["errors_count"]
            error_rate = error_count / max(1, total_messages)
            self.error_counts.append(error_rate)
            
            # Update system status metrics
            self.system_status.metrics.update({
                "active_connections": active_connections,
                "messages_processed": total_messages,
                "error_rate": error_rate,
                "uptime": websocket_stats["service"]["uptime"]
            })
            
            # Check for alerts
            await self._check_thresholds()
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
    
    async def _check_thresholds(self):
        """Check metrics against thresholds and generate alerts"""
        try:
            # Check response times
            if self.response_times:
                avg_response_time = sum(self.response_times) / len(self.response_times)
                if avg_response_time > self.thresholds["response_time_critical"]:
                    self.system_status.add_alert({
                        "type": "performance",
                        "metric": "response_time",
                        "value": avg_response_time,
                        "threshold": self.thresholds["response_time_critical"],
                        "severity": "critical",
                        "message": f"Response time critically high: {avg_response_time:.2f}s"
                    })
                elif avg_response_time > self.thresholds["response_time_warning"]:
                    self.system_status.add_alert({
                        "type": "performance",
                        "metric": "response_time",
                        "value": avg_response_time,
                        "threshold": self.thresholds["response_time_warning"],
                        "severity": "warning",
                        "message": f"Response time high: {avg_response_time:.2f}s"
                    })
            
            # Check error rate
            if self.error_counts:
                avg_error_rate = sum(self.error_counts) / len(self.error_counts)
                if avg_error_rate > self.thresholds["error_rate_critical"]:
                    self.system_status.add_alert({
                        "type": "error",
                        "metric": "error_rate",
                        "value": avg_error_rate,
                        "threshold": self.thresholds["error_rate_critical"],
                        "severity": "critical",
                        "message": f"Error rate critically high: {avg_error_rate:.2%}"
                    })
                elif avg_error_rate > self.thresholds["error_rate_warning"]:
                    self.system_status.add_alert({
                        "type": "error",
                        "metric": "error_rate",
                        "value": avg_error_rate,
                        "threshold": self.thresholds["error_rate_warning"],
                        "severity": "warning",
                        "message": f"Error rate high: {avg_error_rate:.2%}"
                    })
            
            # Check connection count
            if self.connection_counts:
                current_connections = self.connection_counts[-1]
                if current_connections > self.thresholds["connection_count_critical"]:
                    self.system_status.add_alert({
                        "type": "scalability",
                        "metric": "connection_count",
                        "value": current_connections,
                        "threshold": self.thresholds["connection_count_critical"],
                        "severity": "critical",
                        "message": f"Connection count critically high: {current_connections}"
                    })
                elif current_connections > self.thresholds["connection_count_warning"]:
                    self.system_status.add_alert({
                        "type": "scalability",
                        "metric": "connection_count",
                        "value": current_connections,
                        "threshold": self.thresholds["connection_count_warning"],
                        "severity": "warning",
                        "message": f"Connection count high: {current_connections}"
                    })
            
        except Exception as e:
            logger.error(f"Error checking thresholds: {e}")
    
    async def _status_broadcast_loop(self):
        """Broadcast status updates"""
        while True:
            try:
                await asyncio.sleep(60)  # Broadcast every minute
                await self._broadcast_status_update()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in status broadcast: {e}")
                await asyncio.sleep(5)
    
    async def _broadcast_status_update(self):
        """Broadcast system status update"""
        try:
            websocket_service = get_websocket_service()
            
            status_data = {
                "health": self.system_status.get_health_summary(),
                "metrics": self.system_status.metrics.copy(),
                "alerts": self.system_status.alerts[-10:],  # Last 10 alerts
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Broadcast system-wide status update
            await websocket_service.broadcast_system_event(
                WebSocketEvents.SYSTEM_STATUS_UPDATE,
                status_data
            )
            
            logger.debug("Status update broadcasted")
            
        except Exception as e:
            logger.error(f"Error broadcasting status update: {e}")
    
    async def record_response_time(self, response_time: float):
        """Record response time for monitoring"""
        self.response_times.append(response_time)
    
    async def record_error(self):
        """Record an error for monitoring"""
        self.error_counts.append(1.0)  # 100% error rate for this interval
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current system status"""
        return {
            "health": self.system_status.get_health_summary(),
            "metrics": self.system_status.metrics.copy(),
            "alerts": self.system_status.alerts.copy(),
            "performance": {
                "avg_response_time": sum(self.response_times) / len(self.response_times) if self.response_times else 0,
                "avg_error_rate": sum(self.error_counts) / len(self.error_counts) if self.error_counts else 0,
                "current_connections": self.connection_counts[-1] if self.connection_counts else 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_status_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get status history for specified hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        return [
            status for status in self.status_history
            if datetime.fromisoformat(status["timestamp"]) > cutoff
        ]
    
    def get_alerts(self, severity: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get alerts with optional filtering"""
        alerts = self.system_status.alerts.copy()
        
        if severity:
            alerts = [alert for alert in alerts if alert.get("severity") == severity]
        
        return alerts[-limit:][::-1]  # Return most recent first
    
    async def force_health_check(self) -> Dict[str, Any]:
        """Force an immediate health check"""
        await self._perform_health_checks()
        return self.get_current_status()
    
    def get_thresholds(self) -> Dict[str, float]:
        """Get current threshold values"""
        return self.thresholds.copy()
    
    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """Update alert thresholds"""
        self.thresholds.update(new_thresholds)
        logger.info(f"Updated thresholds: {new_thresholds}")

# Global status service instance
status_service = StatusService()

def get_status_service() -> StatusService:
    """Get status service instance"""
    return status_service