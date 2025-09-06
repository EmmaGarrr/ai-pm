from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from ..services.websocket_service import get_websocket_service
from ..services.broadcast_service import get_broadcast_service
from ..services.status_service import get_status_service
from ..events.websocket_events import WebSocketEvents
from ..utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/websocket", tags=["websocket"])

@router.get("/status")
async def get_websocket_status():
    """Get WebSocket service status"""
    try:
        websocket_service = get_websocket_service()
        status = websocket_service.get_statistics()
        
        return {
            "success": True,
            "data": status,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/connections")
async def get_active_connections():
    """Get active WebSocket connections"""
    try:
        websocket_service = get_websocket_service()
        connections = websocket_service.connection_manager.get_statistics()
        
        return {
            "success": True,
            "data": connections,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting active connections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/connections/{connection_id}")
async def get_connection_details(connection_id: str):
    """Get detailed connection information"""
    try:
        websocket_service = get_websocket_service()
        connection_details = websocket_service.connection_manager.get_connection_details(connection_id)
        
        if not connection_details:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        return {
            "success": True,
            "data": connection_details,
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting connection details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcast/stats")
async def get_broadcast_statistics():
    """Get broadcast service statistics"""
    try:
        broadcast_service = get_broadcast_service()
        stats = broadcast_service.get_broadcast_stats()
        
        return {
            "success": True,
            "data": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting broadcast statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcast/active")
async def get_active_broadcasts():
    """Get active broadcast messages"""
    try:
        broadcast_service = get_broadcast_service()
        broadcasts = broadcast_service.get_active_broadcasts()
        
        return {
            "success": True,
            "data": broadcasts,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting active broadcasts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcast/{broadcast_id}")
async def get_broadcast_status(broadcast_id: str):
    """Get status of a specific broadcast"""
    try:
        broadcast_service = get_broadcast_service()
        status = broadcast_service.get_broadcast_status(broadcast_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        
        return {
            "success": True,
            "data": status,
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting broadcast status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/system")
async def get_system_status():
    """Get system-wide status"""
    try:
        status_service = get_status_service()
        status = status_service.get_current_status()
        
        return {
            "success": True,
            "data": status,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/health")
async def get_health_summary():
    """Get system health summary"""
    try:
        status_service = get_status_service()
        health = status_service.system_status.get_health_summary()
        
        return {
            "success": True,
            "data": health,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting health summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/alerts")
async def get_alerts(
    severity: Optional[str] = None,
    limit: int = 50
):
    """Get system alerts with optional filtering"""
    try:
        status_service = get_status_service()
        alerts = status_service.get_alerts(severity=severity, limit=limit)
        
        return {
            "success": True,
            "data": alerts,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/history")
async def get_status_history(hours: int = 24):
    """Get status history for specified hours"""
    try:
        status_service = get_status_service()
        history = status_service.get_status_history(hours=hours)
        
        return {
            "success": True,
            "data": history,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting status history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcast/system")
async def broadcast_system_event(
    event_type: str,
    data: Dict[str, Any],
    priority: int = 2
):
    """Broadcast a system-wide event"""
    try:
        broadcast_service = get_broadcast_service()
        broadcast_id = await broadcast_service.broadcast_system_event(
            event_type=event_type,
            data=data,
            priority=priority
        )
        
        return {
            "success": True,
            "data": {
                "broadcast_id": broadcast_id,
                "event_type": event_type,
                "priority": priority,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error broadcasting system event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcast/project/{project_id}")
async def broadcast_to_project(
    project_id: str,
    event_type: str,
    data: Dict[str, Any],
    priority: int = 1
):
    """Broadcast event to all connections in a project"""
    try:
        broadcast_service = get_broadcast_service()
        broadcast_id = await broadcast_service.broadcast_to_project(
            project_id=project_id,
            event_type=event_type,
            data=data,
            priority=priority
        )
        
        return {
            "success": True,
            "data": {
                "broadcast_id": broadcast_id,
                "project_id": project_id,
                "event_type": event_type,
                "priority": priority,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error broadcasting to project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcast/user/{user_id}")
async def broadcast_to_user(
    user_id: str,
    event_type: str,
    data: Dict[str, Any],
    priority: int = 1
):
    """Broadcast event to all connections of a user"""
    try:
        broadcast_service = get_broadcast_service()
        broadcast_id = await broadcast_service.broadcast_to_user(
            user_id=user_id,
            event_type=event_type,
            data=data,
            priority=priority
        )
        
        return {
            "success": True,
            "data": {
                "broadcast_id": broadcast_id,
                "user_id": user_id,
                "event_type": event_type,
                "priority": priority,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error broadcasting to user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/status/health-check")
async def force_health_check():
    """Force an immediate health check"""
    try:
        status_service = get_status_service()
        status = await status_service.force_health_check()
        
        return {
            "success": True,
            "data": status,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error forcing health check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/types")
async def get_event_types():
    """Get available WebSocket event types"""
    try:
        event_types = {}
        
        # Get all event constants from WebSocketEvents
        for attr_name in dir(WebSocketEvents):
            if not attr_name.startswith('_') and not callable(getattr(WebSocketEvents, attr_name)):
                event_types[attr_name] = getattr(WebSocketEvents, attr_name)
        
        return {
            "success": True,
            "data": {
                "event_types": event_types,
                "total_count": len(event_types)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting event types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for direct WebSocket connections"""
    try:
        websocket_service = get_websocket_service()
        
        # Accept the WebSocket connection
        await websocket.accept()
        
        # Generate connection info
        connection_id = f"direct_{datetime.utcnow().timestamp()}"
        
        logger.info(f"Direct WebSocket connection established: {connection_id}")
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Handle messages
        while True:
            try:
                # Wait for messages
                data = await websocket.receive_json()
                
                # Process message
                message_type = data.get("type")
                
                if message_type == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                elif message_type == "status":
                    status = websocket_service.get_statistics()
                    await websocket.send_json({
                        "type": "status",
                        "data": status,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                elif message_type == "subscribe":
                    # Handle subscription to events
                    project_id = data.get("project_id")
                    user_id = data.get("user_id")
                    
                    subscription_data = {
                        "type": "subscription_confirmed",
                        "project_id": project_id,
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    await websocket.send_json(subscription_data)
                elif message_type == "broadcast":
                    # Handle broadcast request
                    event_type = data.get("event_type")
                    payload = data.get("data")
                    
                    if event_type and payload:
                        await websocket_service.broadcast_system_event(event_type, payload)
                        
                        await websocket.send_json({
                            "type": "broadcast_sent",
                            "event_type": event_type,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {message_type}",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Error processing message",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        logger.info(f"Direct WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket endpoint: {e}")
        try:
            await websocket.close()
        except:
            pass

@router.get("/metrics")
async def get_websocket_metrics():
    """Get WebSocket service metrics"""
    try:
        websocket_service = get_websocket_service()
        broadcast_service = get_broadcast_service()
        status_service = get_status_service()
        
        # Collect metrics from all services
        websocket_stats = websocket_service.get_statistics()
        broadcast_stats = broadcast_service.get_broadcast_stats()
        status_data = status_service.get_current_status()
        
        return {
            "success": True,
            "data": {
                "websocket": websocket_stats,
                "broadcast": broadcast_stats,
                "status": status_data,
                "summary": {
                    "total_connections": websocket_stats["connections"]["active_connections"],
                    "total_broadcasts": broadcast_stats["total_broadcasts"],
                    "success_rate": broadcast_stats["success_rate"],
                    "system_healthy": status_data["health"]["healthy"]
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/maintenance/connections/cleanup")
async def cleanup_inactive_connections():
    """Manually trigger cleanup of inactive connections"""
    try:
        websocket_service = get_websocket_service()
        
        # Get current connection count
        before_count = websocket_service.connection_manager.active_connections
        
        # Trigger cleanup (this would normally run automatically)
        await websocket_service.connection_manager._cleanup_inactive_connections()
        
        # Get new connection count
        after_count = websocket_service.connection_manager.active_connections
        
        return {
            "success": True,
            "data": {
                "connections_before": before_count,
                "connections_after": after_count,
                "connections_removed": before_count - after_count,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error cleaning up connections: {e}")
        raise HTTPException(status_code=500, detail=str(e))