from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional, List
from ..models.ai_response import AIConfig, AIHealthStatus, AIPerformanceMetrics
from ..services.gemini_service import GeminiService
from ..services.context_engine import ContextEngine
from ..services.redis_service import RedisService
from ..utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Global service instances (in production, use proper dependency injection)
_gemini_service = None
_context_engine = None
_redis_service = None

async def get_gemini_service() -> GeminiService:
    """Get Gemini service instance"""
    global _gemini_service
    if _gemini_service is None:
        config = {
            'api_key': 'your-gemini-api-key',  # This should come from environment/config
            'model_name': 'gemini-2.0-flash-001',
            'temperature': 0.3,
            'max_tokens': 2000,
            'confidence_threshold': 0.85,
            'system_prompt_path': 'app/prompts/ai_pm_system.txt'
        }
        _gemini_service = GeminiService(config)
    return _gemini_service

async def get_context_engine() -> ContextEngine:
    """Get context engine instance"""
    global _context_engine, _redis_service
    if _context_engine is None:
        if _redis_service is None:
            _redis_service = RedisService()
            await _redis_service.connect()
        _context_engine = ContextEngine(_redis_service)
    return _context_engine

@router.post("/generate", response_model=Dict[str, Any])
async def generate_ai_response(
    prompt: str,
    context: Optional[Dict[str, Any]] = None,
    service: GeminiService = Depends(get_gemini_service)
):
    """Generate AI response for a given prompt"""
    try:
        logger.info("Generating AI response")
        
        response = await service.generate_dual_output(prompt, context)
        
        logger.info("Successfully generated AI response")
        return response
        
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=AIHealthStatus)
async def get_ai_health(
    service: GeminiService = Depends(get_gemini_service)
):
    """Get AI service health status"""
    try:
        logger.info("Checking AI service health")
        
        start_time = datetime.utcnow()
        is_healthy = await service.health_check()
        response_time = (datetime.utcnow() - start_time).total_seconds()
        
        health_status = AIHealthStatus(
            healthy=is_healthy,
            model_configured=bool(service.api_key),
            api_accessible=is_healthy,
            prompts_loaded=bool(service.system_prompt),
            last_check=datetime.utcnow(),
            response_time=response_time
        )
        
        logger.info(f"AI health check completed: {is_healthy}")
        return health_status
        
    except Exception as e:
        logger.error(f"Error checking AI health: {e}")
        return AIHealthStatus(
            healthy=False,
            model_configured=False,
            api_accessible=False,
            prompts_loaded=False,
            last_check=datetime.utcnow(),
            error_message=str(e)
        )

@router.get("/config", response_model=AIConfig)
async def get_ai_config(
    service: GeminiService = Depends(get_gemini_service)
):
    """Get current AI configuration"""
    try:
        logger.info("Getting AI configuration")
        
        config = AIConfig(
            model_name=service.model_name,
            temperature=service.temperature,
            max_tokens=service.max_tokens,
            confidence_threshold=service.confidence_threshold,
            verification_required=True,  # This could be configurable
            max_context_items=10,  # This could be configurable
            system_prompt_path=service.system_prompt_path,
            user_explanation_template="app/prompts/user_explanation.txt",
            technical_instruction_template="app/prompts/technical_instruction.txt"
        )
        
        logger.info("Retrieved AI configuration")
        return config
        
    except Exception as e:
        logger.error(f"Error getting AI config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config", response_model=Dict[str, Any])
async def update_ai_config(
    config: AIConfig,
    service: GeminiService = Depends(get_gemini_service)
):
    """Update AI configuration"""
    try:
        logger.info("Updating AI configuration")
        
        # Update service configuration
        service.model_name = config.model_name
        service.temperature = config.temperature
        service.max_tokens = config.max_tokens
        service.confidence_threshold = config.confidence_threshold
        
        # Note: In a real implementation, you would persist these changes
        # and reload the service with the new configuration
        
        logger.info("Successfully updated AI configuration")
        return {
            "message": "Configuration updated successfully",
            "config": config.dict()
        }
        
    except Exception as e:
        logger.error(f"Error updating AI config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics", response_model=AIPerformanceMetrics)
async def get_ai_metrics():
    """Get AI service performance metrics"""
    try:
        logger.info("Getting AI performance metrics")
        
        # In a real implementation, you would track these metrics over time
        # For now, we'll return default/placeholder values
        metrics = AIPerformanceMetrics(
            total_requests=0,
            successful_requests=0,
            failed_requests=0,
            average_response_time=0.0,
            average_confidence=0.0,
            verification_rate=0.0,
            cache_hit_rate=0.0
        )
        
        logger.info("Retrieved AI performance metrics")
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting AI metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model/info")
async def get_model_info(
    service: GeminiService = Depends(get_gemini_service)
):
    """Get information about the current AI model"""
    try:
        logger.info("Getting model information")
        
        model_info = service.get_model_info()
        
        logger.info("Retrieved model information")
        return model_info
        
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/confidence")
async def analyze_confidence(
    user_input: str,
    context: Optional[Dict[str, Any]] = None,
    service: GeminiService = Depends(get_gemini_service)
):
    """Analyze confidence level for a given request"""
    try:
        logger.info("Analyzing confidence level")
        
        confidence = await service.analyze_confidence(user_input, context)
        
        logger.info(f"Confidence analysis completed: {confidence}")
        return {
            "confidence": confidence,
            "user_input": user_input,
            "context_provided": context is not None,
            "verification_needed": confidence < service.confidence_threshold
        }
        
    except Exception as e:
        logger.error(f"Error analyzing confidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/context/analyze")
async def analyze_context(
    project_id: str,
    user_input: str,
    context_filter: Optional[Dict[str, Any]] = None,
    engine: ContextEngine = Depends(get_context_engine)
):
    """Analyze context for a given request"""
    try:
        logger.info(f"Analyzing context for project {project_id}")
        
        context_analysis = await engine.analyze_context(project_id, user_input, context_filter)
        
        logger.info(f"Context analysis completed for project {project_id}")
        return context_analysis.dict()
        
    except Exception as e:
        logger.error(f"Error analyzing context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/similar/{project_id}")
async def find_similar_issues(
    project_id: str,
    issue_description: str,
    limit: int = 5,
    engine: ContextEngine = Depends(get_context_engine)
):
    """Find similar issues from past memories"""
    try:
        logger.info(f"Finding similar issues for project {project_id}")
        
        similar_issues = await engine.find_similar_issues(project_id, issue_description, limit)
        
        logger.info(f"Found {len(similar_issues)} similar issues for project {project_id}")
        return {
            "project_id": project_id,
            "issue_description": issue_description,
            "similar_issues": similar_issues,
            "count": len(similar_issues)
        }
        
    except Exception as e:
        logger.error(f"Error finding similar issues: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/summary/{project_id}")
async def get_project_context_summary(
    project_id: str,
    engine: ContextEngine = Depends(get_context_engine)
):
    """Get project context summary"""
    try:
        logger.info(f"Getting context summary for project {project_id}")
        
        summary = await engine.get_project_context_summary(project_id)
        
        logger.info(f"Retrieved context summary for project {project_id}")
        return summary
        
    except Exception as e:
        logger.error(f"Error getting project context summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompts/test")
async def test_prompt(
    system_prompt: str,
    user_input: str,
    context: Optional[Dict[str, Any]] = None,
    service: GeminiService = Depends(get_gemini_service)
):
    """Test a custom prompt with the AI service"""
    try:
        logger.info("Testing custom prompt")
        
        # Temporarily override system prompt
        original_prompt = service.system_prompt
        service.system_prompt = system_prompt
        
        try:
            response = await service.generate_response(user_input, context)
            
            return {
                "success": True,
                "response": response,
                "prompt_length": len(system_prompt),
                "input_length": len(user_input)
            }
        finally:
            # Restore original prompt
            service.system_prompt = original_prompt
        
    except Exception as e:
        logger.error(f"Error testing prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prompts/system")
async def get_system_prompt(
    service: GeminiService = Depends(get_gemini_service)
):
    """Get the current system prompt"""
    try:
        logger.info("Getting system prompt")
        
        return {
            "system_prompt": service.system_prompt,
            "prompt_length": len(service.system_prompt),
            "prompt_path": service.system_prompt_path
        }
        
    except Exception as e:
        logger.error(f"Error getting system prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompts/system")
async def update_system_prompt(
    system_prompt: str,
    service: GeminiService = Depends(get_gemini_service)
):
    """Update the system prompt"""
    try:
        logger.info("Updating system prompt")
        
        # Update the system prompt
        service.system_prompt = system_prompt
        
        # Note: In a real implementation, you would also save this to file
        
        logger.info("Successfully updated system prompt")
        return {
            "message": "System prompt updated successfully",
            "prompt_length": len(system_prompt)
        }
        
    except Exception as e:
        logger.error(f"Error updating system prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Import datetime for health check
from datetime import datetime