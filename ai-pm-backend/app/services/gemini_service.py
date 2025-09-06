import google.generativeai as genai
from typing import Dict, Any, Optional, List
import json
import logging
from datetime import datetime
from .base_ai_service import BaseAIService
from ..utils.logger import get_logger

logger = get_logger(__name__)

class GeminiService(BaseAIService):
    """Gemini AI service implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get('api_key')
        if not self.api_key:
            raise ValueError("Gemini API key is required")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
        # Load system prompts
        self.system_prompt_path = config.get('system_prompt_path', 'app/prompts/ai_pm_system.txt')
        self.system_prompt = self._load_system_prompt()
        
    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            with open(self.system_prompt_path, 'r') as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"System prompt file not found: {self.system_prompt_path}")
            return self._get_default_system_prompt()
    
    def _get_default_system_prompt(self) -> str:
        """Get default system prompt if file not found"""
        return """You are an AI Project Manager acting as an intermediary between non-technical users and AI developers. 
        Generate dual outputs: user explanations (simple, 10-15 sentences) and technical instructions (specific, actionable). 
        Always respond in JSON format with user_explanation, technical_instruction, confidence, and metadata fields."""
    
    async def generate_response(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate AI response using Gemini API"""
        try:
            # Format prompt with context
            formatted_prompt = self._format_prompt(self.system_prompt, prompt, context)
            
            # Generate response
            response = self.model.generate_content(
                formatted_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                    response_mime_type="application/json"
                )
            )
            
            # Parse and validate response
            response_text = response.text
            try:
                response_data = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                response_data = self._extract_json_from_text(response_text)
            
            # Ensure response has required fields
            response_data = self._ensure_response_format(response_data)
            
            return response_data
            
        except Exception as e:
            logger.error(f"Error generating Gemini response: {e}")
            raise Exception(f"Gemini API error: {str(e)}")
    
    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Extract JSON from text that might contain additional content"""
        try:
            # Look for JSON object in text
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = text[start:end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        # Return basic response if JSON extraction fails
        return {
            "user_explanation": "I understand your request, but encountered an issue with the response format.",
            "technical_instruction": "Please try rephrasing your request or provide more specific details.",
            "confidence": 0.5,
            "metadata": {"error": "Response parsing failed", "raw_response": text}
        }
    
    def _ensure_response_format(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure response has all required fields"""
        required_fields = {
            'user_explanation': 'Response not available',
            'technical_instruction': 'Instructions not available',
            'confidence': 0.5,
            'metadata': {}
        }
        
        for field, default_value in required_fields.items():
            if field not in response:
                response[field] = default_value
        
        # Ensure metadata has required fields
        if 'memory_keys' not in response['metadata']:
            response['metadata']['memory_keys'] = []
        if 'dependencies' not in response['metadata']:
            response['metadata']['dependencies'] = []
        if 'context_items' not in response['metadata']:
            response['metadata']['context_items'] = 0
        
        return response
    
    async def generate_dual_output(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate dual output response (user explanation + technical instructions)"""
        enhanced_prompt = f"""
        Generate a dual output response for the following user request:
        
        User Request: {user_input}
        
        Your response must include:
        1. User Explanation: 10-15 sentences in simple language for non-technical users
        2. Technical Instructions: Specific, actionable instructions for AI developers
        3. Confidence Assessment: 0-100% based on context completeness
        4. Metadata: Memory keys, dependencies, and context information
        
        Respond in JSON format with the exact structure:
        {{
            "user_explanation": "...",
            "technical_instruction": "...",
            "confidence": 0.85,
            "metadata": {{
                "memory_keys": ["key1", "key2"],
                "dependencies": ["dep1", "dep2"],
                "context_items": 5
            }}
        }}
        """
        
        return await self.generate_with_retry(enhanced_prompt, context)
    
    async def health_check(self) -> bool:
        """Check if Gemini API is accessible"""
        try:
            # Simple test to verify API connectivity
            test_response = self.model.generate_content(
                "Respond with 'OK' if you can read this message.",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=10
                )
            )
            return test_response.text.strip() == "OK"
        except Exception as e:
            logger.error(f"Gemini health check failed: {e}")
            return False
    
    async def analyze_confidence(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> float:
        """Analyze confidence level for a given request"""
        confidence_prompt = f"""
        Analyze the confidence level for the following user request based on the available context:
        
        User Request: {user_input}
        
        Context: {json.dumps(context, indent=2) if context else 'No context available'}
        
        Consider:
        1. How complete is the information?
        2. How similar is this to past successful solutions?
        3. Are there any ambiguities or missing details?
        4. Is the request within the scope of known capabilities?
        
        Respond with only a number between 0 and 1 representing confidence level.
        """
        
        try:
            response = self.model.generate_content(
                confidence_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=10,
                    temperature=0.1
                )
            )
            
            confidence_text = response.text.strip()
            return float(confidence_text)
            
        except Exception as e:
            logger.error(f"Error analyzing confidence: {e}")
            return 0.5  # Default confidence
    
    async def generate_verification_prompt(self, original_request: str, proposed_solution: Dict[str, Any]) -> str:
        """Generate verification prompt for quality assurance"""
        verification_template = """
        ## Verification Required Before Implementation
        
        ### Original Request
        {original_request}
        
        ### Proposed Solution
        User Explanation: {user_explanation}
        Technical Instructions: {technical_instruction}
        Confidence: {confidence}
        
        ### Verification Checklist
        - [ ] Request is fully understood
        - [ ] Solution addresses all requirements
        - [ ] Technical instructions are actionable
        - [ ] Dependencies are identified
        - [ ] Potential impacts are considered
        - [ ] Testing approach is defined
        
        ### Additional Information Needed
        {additional_info}
        
        ### Verification Intensity
        {intensity} verification required based on confidence level.
        """
        
        return verification_template.format(
            original_request=original_request,
            user_explanation=proposed_solution.get('user_explanation', ''),
            technical_instruction=proposed_solution.get('technical_instruction', ''),
            confidence=proposed_solution.get('confidence', 0),
            additional_info=self._get_additional_info_needed(proposed_solution),
            intensity=self.get_verification_intensity(proposed_solution.get('confidence', 0))
        )
    
    def _get_additional_info_needed(self, solution: Dict[str, Any]) -> str:
        """Identify additional information needed for verification"""
        confidence = solution.get('confidence', 0)
        
        if confidence < 0.7:
            return "More specific requirements, detailed context, and clarification of ambiguities needed."
        elif confidence < 0.85:
            return "Some additional details about implementation preferences or constraints would be helpful."
        else:
            return "Current information appears sufficient for implementation."
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model configuration"""
        return {
            "model_name": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "confidence_threshold": self.confidence_threshold,
            "api_key_configured": bool(self.api_key),
            "system_prompt_loaded": bool(self.system_prompt)
        }