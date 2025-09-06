from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.models.project import Project, ProjectCreate, ProjectUpdate
from app.services.redis_service import memory_service
from app.models.memory import MemoryCreate, MessageType
import json
from datetime import datetime

router = APIRouter()

# In-memory storage for projects (in real app, this would be in Redis or database)
projects_db: Dict[str, Project] = {}

@router.post("/", response_model=Project)
async def create_project(project_data: ProjectCreate) -> Project:
    """Create a new project"""
    try:
        project = Project(
            name=project_data.name,
            description=project_data.description
        )
        
        # Store project
        projects_db[project.id] = project
        
        # Store project in Redis memory
        memory_data = MemoryCreate(
            key=f"project_{project.id}",
            value=project.dict(),
            type=MessageType.CONTEXT,
            project_id=project.id
        )
        await memory_service.store_memory(memory_data)
        
        return project
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/", response_model=List[Project])
async def get_projects() -> List[Project]:
    """Get all projects"""
    try:
        return list(projects_db.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get projects: {str(e)}")

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    """Get a specific project"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return projects_db[project_id]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project: {str(e)}")

@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate) -> Project:
    """Update a project"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = projects_db[project_id]
        
        # Update fields
        if project_data.name is not None:
            project.name = project_data.name
        if project_data.description is not None:
            project.description = project_data.description
        if project_data.status is not None:
            project.status = project_data.status
        if project_data.metadata is not None:
            project.metadata = project_data.metadata
            
        project.updated_at = datetime.utcnow()
        
        # Update in Redis memory
        memory_data = MemoryCreate(
            key=f"project_{project_id}",
            value=project.dict(),
            type=MessageType.CONTEXT,
            project_id=project_id
        )
        await memory_service.store_memory(memory_data)
        
        return project
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

@router.delete("/{project_id}")
async def delete_project(project_id: str) -> Dict[str, str]:
    """Delete a project"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Remove from memory
        del projects_db[project_id]
        
        # Clear Redis memory for this project
        await memory_service.clear_project_memory(project_id)
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@router.get("/{project_id}/memory/count")
async def get_project_memory_count(project_id: str) -> Dict[str, int]:
    """Get memory count for a project"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        count = await memory_service.get_memory_count(project_id)
        return {"project_id": project_id, "memory_count": count}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get memory count: {str(e)}")