from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.models.memory import MemoryCreate, MemoryRecall, MemoryItem
from app.services.redis_service import memory_service

router = APIRouter()

@router.post("/store")
async def store_memory(memory_data: MemoryCreate) -> Dict[str, str]:
    """Store a memory item"""
    try:
        success = await memory_service.store_memory(memory_data)
        if success:
            return {"message": "Memory stored successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to store memory")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store memory: {str(e)}")

@router.post("/recall", response_model=List[Dict[str, Any]])
async def recall_memory(recall_data: MemoryRecall) -> List[Dict[str, Any]]:
    """Recall memory items based on query"""
    try:
        memories = await memory_service.recall_memory(recall_data)
        return memories
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recall memory: {str(e)}")

@router.delete("/{project_id}/{key}")
async def delete_memory(project_id: str, key: str) -> Dict[str, str]:
    """Delete a specific memory item"""
    try:
        success = await memory_service.delete_memory(project_id, key)
        if success:
            return {"message": "Memory deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Memory not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete memory: {str(e)}")

@router.get("/{project_id}/count")
async def get_memory_count(project_id: str) -> Dict[str, int]:
    """Get memory count for a project"""
    try:
        count = await memory_service.get_memory_count(project_id)
        return {"project_id": project_id, "count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get memory count: {str(e)}")

@router.delete("/{project_id}")
async def clear_project_memory(project_id: str) -> Dict[str, str]:
    """Clear all memory for a project"""
    try:
        success = await memory_service.clear_project_memory(project_id)
        if success:
            return {"message": "Project memory cleared successfully"}
        else:
            raise HTTPException(status_code=404, detail="No memory found for project")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear project memory: {str(e)}")