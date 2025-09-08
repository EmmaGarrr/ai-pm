from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.models.project import Project, ProjectCreate, ProjectUpdate
from app.services.redis_service import memory_service
from app.models.memory import MemoryCreate, MessageType
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

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
    """Get all projects from both memory and Redis"""
    try:
        # Get projects from in-memory storage
        memory_projects = list(projects_db.values())
        
        # Get projects from Redis storage
        redis_projects = await _get_redis_projects()
        
        # Merge both sources, avoiding duplicates
        all_projects = memory_projects.copy()
        existing_ids = {p.id for p in memory_projects}
        
        for redis_project in redis_projects:
            if redis_project.id not in existing_ids:
                all_projects.append(redis_project)
                # Also add to in-memory cache for future requests
                projects_db[redis_project.id] = redis_project
                existing_ids.add(redis_project.id)
        
        logger.info(f"Retrieved {len(all_projects)} projects: {len(memory_projects)} from memory, {len(redis_projects)} from Redis")
        return all_projects
        
    except Exception as e:
        logger.error(f"Failed to get projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get projects: {str(e)}")

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    """Get a specific project from memory or Redis"""
    try:
        # First check in-memory storage
        if project_id in projects_db:
            return projects_db[project_id]
        
        # If not in memory, check Redis
        redis_project = await _get_redis_project(project_id)
        if redis_project:
            # Add to in-memory cache for future requests
            projects_db[project_id] = redis_project
            return redis_project
        
        raise HTTPException(status_code=404, detail="Project not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get project: {str(e)}")

@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate) -> Project:
    """Update a project in both memory and Redis"""
    try:
        # Check if project exists in memory or Redis
        if project_id in projects_db:
            project = projects_db[project_id]
        else:
            # Try to get from Redis
            project = await _get_redis_project(project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            # Add to memory cache
            projects_db[project_id] = project
        
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
        
        logger.info(f"Updated project {project_id}: {project.name}")
        return project
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

@router.delete("/{project_id}")
async def delete_project(project_id: str) -> Dict[str, str]:
    """Delete a project from both memory and Redis"""
    try:
        project_exists = False
        
        # Check if project exists in memory
        if project_id in projects_db:
            project_exists = True
            # Remove from memory
            del projects_db[project_id]
        
        # Check if project exists in Redis
        redis_project = await _get_redis_project(project_id)
        if redis_project:
            project_exists = True
        
        if not project_exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Clear Redis memory for this project
        cleared = await memory_service.clear_project_memory(project_id)
        
        logger.info(f"Deleted project {project_id}, Redis cleared: {cleared}")
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@router.get("/{project_id}/memory/count")
async def get_project_memory_count(project_id: str) -> Dict[str, int]:
    """Get memory count for a project"""
    try:
        # Check if project exists in memory or Redis
        if project_id in projects_db:
            pass  # Project exists in memory
        else:
            # Try to get from Redis
            redis_project = await _get_redis_project(project_id)
            if not redis_project:
                raise HTTPException(status_code=404, detail="Project not found")
        
        count = await memory_service.get_memory_count(project_id)
        return {"project_id": project_id, "memory_count": count}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get memory count for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get memory count: {str(e)}")


# Helper functions for Redis operations

async def _get_redis_projects() -> List[Project]:
    """Get all projects from Redis storage"""
    try:
        if not memory_service.redis:
            logger.warning("Redis not connected")
            return []
        
        # Get all project keys from Redis
        pattern = "*:memory:context:project_*"
        project_keys = await memory_service.redis.keys(pattern)
        
        projects = []
        for key in project_keys:
            try:
                # Get project data from Redis
                project_data = await memory_service.redis.get(key)
                if project_data:
                    project_json = json.loads(project_data)
                    project_dict = project_json.get('value', {})
                    
                    # Convert to Project object
                    project = Project(**project_dict)
                    projects.append(project)
                    
            except Exception as e:
                logger.error(f"Error loading project from Redis {key}: {e}")
                continue
                
        logger.info(f"Retrieved {len(projects)} projects from Redis")
        return projects
        
    except Exception as e:
        logger.error(f"Error getting Redis projects: {e}")
        return []

async def _get_redis_project(project_id: str) -> Project:
    """Get a specific project from Redis storage"""
    try:
        if not memory_service.redis:
            logger.warning("Redis not connected")
            return None
        
        # Try different key patterns that might contain the project
        patterns = [
            f"*:memory:context:project_{project_id}",
            f"project:{project_id}:memory:context:project_{project_id}"
        ]
        
        for pattern in patterns:
            keys = await memory_service.redis.keys(pattern)
            for key in keys:
                try:
                    project_data = await memory_service.redis.get(key)
                    if project_data:
                        project_json = json.loads(project_data)
                        project_dict = project_json.get('value', {})
                        
                        # Verify this is the correct project
                        if project_dict.get('id') == project_id:
                            project = Project(**project_dict)
                            logger.info(f"Retrieved project {project_id} from Redis")
                            return project
                            
                except Exception as e:
                    logger.error(f"Error loading project {project_id} from Redis {key}: {e}")
                    continue
        
        logger.warning(f"Project {project_id} not found in Redis")
        return None
        
    except Exception as e:
        logger.error(f"Error getting Redis project {project_id}: {e}")
        return None