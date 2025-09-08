from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import json
from ..utils.logger import get_logger

logger = get_logger(__name__)

class BaseAIService(ABC):
    """Base class for AI services with common functionality"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.model_name = config.get('model_name', 'default')
        self.temperature = config.get('temperature', 0.3)
        self.max_tokens = config.get('max_tokens', 2000)
        self.confidence_threshold = config.get('confidence_threshold', 0.85)
        
    @abstractmethod
    async def generate_response(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate AI response based on prompt and context"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if AI service is healthy and accessible"""
        pass
    
    def _format_prompt(self, system_prompt: str, user_input: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Format prompt with system instructions and context"""
        formatted_prompt = f"{system_prompt}\n\n"
        
        if context:
            # Handle chat history specifically
            if 'recent_chat_history' in context and context['recent_chat_history']:
                formatted_prompt += "## Recent Conversation History:\n"
                for i, msg in enumerate(context['recent_chat_history'], 1):
                    formatted_prompt += f"Message {i}: {msg['role']} - {msg['content']}\n"
                formatted_prompt += "\n"
            
            # Handle other context types
            if 'project_history' in context:
                formatted_prompt += f"Project History: {json.dumps(context['project_history'], indent=2)}\n"
            if 'relevant_memories' in context:
                formatted_prompt += f"Relevant Memories: {json.dumps(context['relevant_memories'], indent=2)}\n"
            if 'current_state' in context:
                formatted_prompt += f"Current State: {json.dumps(context['current_state'], indent=2)}\n"
            if 'context_analysis' in context:
                analysis = context['context_analysis']
                formatted_prompt += f"Context Analysis:\n"
                formatted_prompt += f"- Context Score: {analysis.get('context_score', 0)}\n"
                formatted_prompt += f"- Completeness Score: {analysis.get('completeness_score', 0)}\n"
                formatted_prompt += f"- Confidence Score: {analysis.get('confidence_score', 0)}\n"
                formatted_prompt += f"- Suggested Actions: {analysis.get('suggested_actions', [])}\n"
            formatted_prompt += "\n"
        
        formatted_prompt += f"## Current User Request:\n{user_input}\n\n"
        formatted_prompt += "IMPORTANT: Use the conversation history above to understand the context of the current request. Reference previous messages when relevant.\n\n"
        formatted_prompt += "Please provide your response in the specified JSON format."
        
        return formatted_prompt
    
    def _validate_response(self, response: Dict[str, Any]) -> bool:
        """Validate AI response format and content"""
        required_fields = ['user_explanation', 'technical_instruction', 'confidence', 'metadata']
        
        if not all(field in response for field in required_fields):
            logger.error(f"Missing required fields in AI response: {response}")
            return False
        
        if not isinstance(response['confidence'], (int, float)) or not (0 <= response['confidence'] <= 1):
            logger.error(f"Invalid confidence value: {response['confidence']}")
            return False
        
        if not isinstance(response['metadata'], dict):
            logger.error(f"Invalid metadata format: {response['metadata']}")
            return False
        
        return True
    
    def _calculate_processing_time(self, start_time: datetime) -> float:
        """Calculate processing time in seconds"""
        return (datetime.utcnow() - start_time).total_seconds()
    
    def _log_generation_attempt(self, prompt: str, response: Optional[Dict[str, Any]] = None, error: Optional[str] = None):
        """Log AI generation attempt for monitoring"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'model': self.model_name,
            'prompt_length': len(prompt),
            'response_length': len(json.dumps(response)) if response else 0,
            'success': response is not None,
            'error': error
        }
        
        if response:
            log_data['confidence'] = response.get('confidence', 0)
            log_data['processing_time'] = response.get('metadata', {}).get('processing_time', 0)
        
        logger.info(f"AI Generation Attempt: {json.dumps(log_data)}")
    
    def _extract_memory_keys(self, response: Dict[str, Any]) -> List[str]:
        """Extract memory keys from AI response for storage"""
        metadata = response.get('metadata', {})
        return metadata.get('memory_keys', [])
    
    def _extract_dependencies(self, response: Dict[str, Any]) -> List[str]:
        """Extract dependencies from AI response"""
        metadata = response.get('metadata', {})
        return metadata.get('dependencies', [])
    
    async def generate_with_retry(self, prompt: str, context: Optional[Dict[str, Any]] = None, max_retries: int = 3) -> Dict[str, Any]:
        """Generate response with retry logic"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                start_time = datetime.utcnow()
                response = await self.generate_response(prompt, context)
                
                if response and self._validate_response(response):
                    # Add processing time to metadata
                    if 'metadata' not in response:
                        response['metadata'] = {}
                    response['metadata']['processing_time'] = self._calculate_processing_time(start_time)
                    response['metadata']['attempt'] = attempt + 1
                    
                    self._log_generation_attempt(prompt, response)
                    return response
                else:
                    last_error = "Invalid response format"
                    logger.warning(f"Attempt {attempt + 1}: Invalid response format")
                    
            except Exception as e:
                last_error = str(e)
                logger.error(f"Attempt {attempt + 1}: Error generating response: {e}")
                
            # Wait before retry (exponential backoff)
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep(2 ** attempt)
        
        # All attempts failed
        self._log_generation_attempt(prompt, error=last_error)
        raise Exception(f"Failed to generate response after {max_retries} attempts. Last error: {last_error}")
    
    def should_verify(self, confidence: float) -> bool:
        """Determine if verification is needed based on confidence"""
        return confidence < self.confidence_threshold
    
    def get_verification_intensity(self, confidence: float) -> str:
        """Get verification intensity based on confidence level"""
        if confidence >= 0.85:
            return "basic"
        elif confidence >= 0.70:
            return "moderate"
        else:
            return "comprehensive"