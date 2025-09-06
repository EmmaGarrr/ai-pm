import json
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import math
from .base_service import BaseService
from .websocket_service import get_websocket_service
from .status_service import get_status_service
from ..models.ai_response import ContextAnalysis, MemoryContext
from ..models.memory import MemoryRecall, MessageType
from ..events.websocket_events import WebSocketEvents
from ..utils.logger import get_logger

logger = get_logger(__name__)

class ContextEngine(BaseService):
    """Context engine for intelligent memory analysis and retrieval"""
    
    def __init__(self, redis_service):
        super().__init__()
        self.redis_service = redis_service
        self.max_context_items = 10
        self.similarity_threshold = 0.3
        self.time_decay_factor = 0.1  # Decay factor for time-based relevance
        
        # Get WebSocket and status services
        self.websocket_service = get_websocket_service()
        self.status_service = get_status_service()
        
    async def initialize(self) -> bool:
        """Initialize the context engine"""
        try:
            logger.info("Initializing ContextEngine")
            # Test Redis connection
            if self.redis_service:
                await self.redis_service.ping()
            logger.info("ContextEngine initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize ContextEngine: {e}")
            return False
    
    async def health_check(self) -> bool:
        """Check if context engine is healthy"""
        try:
            # Test Redis connection
            if self.redis_service:
                await self.redis_service.ping()
            return True
        except Exception as e:
            logger.error(f"ContextEngine health check failed: {e}")
            return False
        
    async def analyze_context(self, project_id: str, user_input: str, context_filter: Optional[Dict[str, Any]] = None) -> ContextAnalysis:
        """Analyze context and retrieve relevant memories"""
        start_time = datetime.utcnow()
        
        try:
            # Emit context analysis start event
            await self._emit_context_analysis_start(project_id, user_input)
            
            # Extract key terms from user input
            key_terms = self._extract_key_terms(user_input)
            await self._emit_key_terms_extracted(project_id, key_terms)
            
            # Retrieve relevant memories
            relevant_memories = await self._retrieve_relevant_memories(project_id, key_terms, context_filter)
            await self._emit_memories_retrieved(project_id, len(relevant_memories))
            
            # Calculate context scores
            context_score = self._calculate_context_score(relevant_memories, key_terms)
            completeness_score = self._calculate_completeness_score(relevant_memories, user_input)
            confidence_score = self._calculate_confidence_score(relevant_memories, user_input)
            
            # Generate suggested actions
            suggested_actions = self._generate_suggested_actions(relevant_memories, scores={
                'context': context_score,
                'completeness': completeness_score,
                'confidence': confidence_score
            })
            
            # Record processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            await self.status_service.record_response_time(processing_time)
            
            result = ContextAnalysis(
                project_id=project_id,
                relevant_memories=relevant_memories,
                context_score=context_score,
                completeness_score=completeness_score,
                confidence_score=confidence_score,
                suggested_actions=suggested_actions,
                timestamp=datetime.utcnow()
            )
            
            # Emit context analysis complete event
            await self._emit_context_analysis_complete(project_id, result, processing_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing context for project {project_id}: {e}")
            
            # Record error for status monitoring
            await self.status_service.record_error()
            
            # Emit context analysis error event
            await self._emit_context_analysis_error(project_id, str(e))
            
            return ContextAnalysis(
                project_id=project_id,
                relevant_memories=[],
                context_score=0.0,
                completeness_score=0.0,
                confidence_score=0.0,
                suggested_actions=["Error occurred during context analysis"],
                timestamp=datetime.utcnow()
            )
    
    def _extract_key_terms(self, text: str) -> List[str]:
        """Extract key terms from text using simple NLP techniques"""
        # Clean and normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Split into words and filter common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        words = text.split()
        key_terms = [word for word in words if len(word) > 2 and word not in stop_words]
        
        # Return unique terms
        return list(set(key_terms))
    
    async def _retrieve_relevant_memories(self, project_id: str, key_terms: List[str], context_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Retrieve relevant memories based on key terms and context"""
        try:
            # Get all memories for the project
            recall_data = MemoryRecall(
                project_id=project_id,
                query="",
                memory_types=[MessageType.ERROR, MessageType.SOLUTION, MessageType.CONTEXT, MessageType.DEPENDENCY],
                limit=100
            )
            all_memories = await self.redis_service.recall_memory(recall_data)
            
            # Score memories based on relevance
            scored_memories = []
            for memory in all_memories:
                relevance_score = self._calculate_relevance_score(memory, key_terms)
                if relevance_score >= self.similarity_threshold:
                    scored_memories.append((memory, relevance_score))
            
            # Sort by relevance score and apply time decay
            scored_memories.sort(key=lambda x: (x[1] * self._apply_time_decay(x[0])), reverse=True)
            
            # Apply context filter if provided
            if context_filter:
                scored_memories = self._apply_context_filter(scored_memories, context_filter)
            
            # Return top memories
            top_memories = scored_memories[:self.max_context_items]
            
            # Add relevance scores to memories
            result = []
            for memory, score in top_memories:
                memory_copy = memory.copy()
                memory_copy['relevance_score'] = score
                result.append(memory_copy)
            
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving memories for project {project_id}: {e}")
            return []
    
    def _calculate_relevance_score(self, memory: Dict[str, Any], key_terms: List[str]) -> float:
        """Calculate relevance score between memory and key terms"""
        try:
            memory_text = json.dumps(memory, default=str).lower()
            score = 0.0
            
            for term in key_terms:
                if term in memory_text:
                    # Calculate term frequency
                    term_count = memory_text.count(term)
                    score += term_count * len(term)  # Weight by term length
            
            # Normalize score
            max_possible_score = sum(len(term) for term in key_terms) * 2  # Assuming max frequency of 2
            if max_possible_score > 0:
                score = min(score / max_possible_score, 1.0)
            
            return score
            
        except Exception as e:
            logger.error(f"Error calculating relevance score: {e}")
            return 0.0
    
    def _apply_time_decay(self, memory: Dict[str, Any]) -> float:
        """Apply time decay factor to memory relevance"""
        try:
            memory_time = memory.get('timestamp', '')
            if not memory_time:
                return 1.0
            
            # Parse timestamp
            try:
                if isinstance(memory_time, str):
                    memory_datetime = datetime.fromisoformat(memory_time.replace('Z', '+00:00'))
                else:
                    memory_datetime = memory_time
                
                # Calculate age in hours
                age_hours = (datetime.utcnow() - memory_datetime).total_seconds() / 3600
                
                # Apply exponential decay
                decay_factor = math.exp(-self.time_decay_factor * age_hours)
                return max(decay_factor, 0.1)  # Minimum decay factor of 0.1
                
            except Exception as e:
                logger.error(f"Error parsing memory timestamp: {e}")
                return 1.0
                
        except Exception as e:
            logger.error(f"Error applying time decay: {e}")
            return 1.0
    
    def _apply_context_filter(self, memories: List[Tuple[Dict[str, Any], float]], context_filter: Dict[str, Any]) -> List[Tuple[Dict[str, Any], float]]:
        """Apply context-based filtering to memories"""
        try:
            filtered_memories = []
            
            for memory, score in memories:
                include = True
                
                # Filter by memory type
                if 'memory_types' in context_filter:
                    if memory.get('type') not in context_filter['memory_types']:
                        include = False
                
                # Filter by time range
                if 'time_range' in context_filter:
                    time_range = context_filter['time_range']
                    memory_time = memory.get('timestamp', '')
                    if memory_time:
                        try:
                            if isinstance(memory_time, str):
                                memory_datetime = datetime.fromisoformat(memory_time.replace('Z', '+00:00'))
                            else:
                                memory_datetime = memory_time
                            
                            start_time = time_range.get('start')
                            end_time = time_range.get('end')
                            
                            if start_time and memory_datetime < start_time:
                                include = False
                            if end_time and memory_datetime > end_time:
                                include = False
                        except Exception:
                            pass
                
                if include:
                    filtered_memories.append((memory, score))
            
            return filtered_memories
            
        except Exception as e:
            logger.error(f"Error applying context filter: {e}")
            return memories
    
    def _calculate_context_score(self, memories: List[Dict[str, Any]], key_terms: List[str]) -> float:
        """Calculate overall context score"""
        if not memories:
            return 0.0
        
        # Calculate based on number of relevant memories and their scores
        total_relevance = sum(memory.get('relevance_score', 0) for memory in memories)
        context_score = min(total_relevance / len(key_terms), 1.0) if key_terms else 0.0
        
        return context_score
    
    def _calculate_completeness_score(self, memories: List[Dict[str, Any]], user_input: str) -> float:
        """Calculate completeness score based on available information"""
        if not memories:
            return 0.0
        
        # Check for different types of information
        has_errors = any(m.get('type') == 'error' for m in memories)
        has_solutions = any(m.get('type') == 'solution' for m in memories)
        has_context = any(m.get('type') == 'context' for m in memories)
        has_dependencies = any(m.get('type') == 'dependency' for m in memories)
        
        # Calculate completeness based on information diversity
        completeness_factors = sum([has_errors, has_solutions, has_context, has_dependencies])
        completeness_score = completeness_factors / 4.0
        
        # Adjust based on memory recency and relevance
        avg_relevance = sum(m.get('relevance_score', 0) for m in memories) / len(memories)
        completeness_score *= avg_relevance
        
        return min(completeness_score, 1.0)
    
    def _calculate_confidence_score(self, memories: List[Dict[str, Any]], user_input: str) -> float:
        """Calculate confidence score for response generation"""
        if not memories:
            return 0.0
        
        # Base confidence on context completeness and memory quality
        context_score = self._calculate_context_score(memories, self._extract_key_terms(user_input))
        completeness_score = self._calculate_completeness_score(memories, user_input)
        
        # Calculate weighted confidence
        confidence_score = (context_score * 0.6) + (completeness_score * 0.4)
        
        # Boost confidence if there are recent, high-relevance solutions
        recent_solutions = [m for m in memories if m.get('type') == 'solution' and m.get('relevance_score', 0) > 0.7]
        if recent_solutions:
            confidence_score = min(confidence_score * 1.2, 1.0)
        
        return confidence_score
    
    def _generate_suggested_actions(self, memories: List[Dict[str, Any]], scores: Dict[str, float]) -> List[str]:
        """Generate suggested actions based on context analysis"""
        actions = []
        
        context_score = scores.get('context', 0)
        completeness_score = scores.get('completeness', 0)
        confidence_score = scores.get('confidence', 0)
        
        # Low context score - need more information
        if context_score < 0.3:
            actions.append("Request more specific details about the issue")
        
        # Low completeness score - missing information types
        if completeness_score < 0.5:
            missing_types = []
            if not any(m.get('type') == 'error' for m in memories):
                missing_types.append("error information")
            if not any(m.get('type') == 'solution' for m in memories):
                missing_types.append("solution examples")
            if not any(m.get('type') == 'context' for m in memories):
                missing_types.append("project context")
            if not any(m.get('type') == 'dependency' for m in memories):
                missing_types.append("dependency information")
            
            if missing_types:
                actions.append(f"Gather more {', '.join(missing_types)}")
        
        # Medium confidence - verification recommended
        if 0.5 <= confidence_score < 0.8:
            actions.append("Proceed with verification steps")
        
        # High confidence - proceed with implementation
        if confidence_score >= 0.8:
            actions.append("High confidence - proceed with implementation")
        
        # Always suggest reviewing relevant memories
        if memories:
            actions.append(f"Review {len(memories)} relevant memories from past interactions")
        
        return actions
    
    async def store_context_memory(self, project_id: str, memory_data: Dict[str, Any]) -> bool:
        """Store a context memory item"""
        try:
            from ..models.memory import MemoryCreate, MessageType
            
            # Add timestamp and relevance info
            memory_data['timestamp'] = datetime.utcnow().isoformat()
            memory_data['relevance_score'] = 1.0  # New memories start with high relevance
            
            # Store in Redis
            memory_key = f"context_{memory_data.get('type', 'general')}_{datetime.utcnow().timestamp()}"
            
            # Determine memory type
            memory_type_str = memory_data.get('type', 'context')
            memory_type = MessageType.CONTEXT  # Default to CONTEXT
            
            # Map string types to enum values
            if memory_type_str == 'error':
                memory_type = MessageType.ERROR
            elif memory_type_str == 'solution':
                memory_type = MessageType.SOLUTION
            elif memory_type_str == 'dependency':
                memory_type = MessageType.DEPENDENCY
            
            memory_create_data = MemoryCreate(
                key=memory_key,
                value=memory_data,
                type=memory_type,
                project_id=project_id
            )
            
            success = await self.redis_service.store_memory(memory_create_data)
            
            if success:
                logger.info(f"Stored context memory for project {project_id}")
                
                # Emit memory stored event
                await self._emit_memory_stored(project_id, memory_key, memory_data)
            
            return success
            
        except Exception as e:
            logger.error(f"Error storing context memory: {e}")
            return False
    
    async def find_similar_issues(self, project_id: str, issue_description: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find similar issues from past memories"""
        try:
            # Emit similar issues search start event
            await self._emit_similar_issues_search_start(project_id, issue_description)
            
            key_terms = self._extract_key_terms(issue_description)
            
            # Focus on error and solution memories
            context_filter = {
                'memory_types': ['error', 'solution']
            }
            
            similar_memories = await self._retrieve_relevant_memories(project_id, key_terms, context_filter)
            
            # Return top similar issues
            result = similar_memories[:limit]
            
            # Emit similar issues found event
            await self._emit_similar_issues_found(project_id, issue_description, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error finding similar issues: {e}")
            await self._emit_context_analysis_error(project_id, f"Similar issues search failed: {e}")
            return []
    
    async def get_project_context_summary(self, project_id: str) -> Dict[str, Any]:
        """Get a summary of project context"""
        try:
            # Get recent memories
            recall_data = MemoryRecall(
                project_id=project_id,
                query="",
                memory_types=[MessageType.ERROR, MessageType.SOLUTION, MessageType.CONTEXT, MessageType.DEPENDENCY],
                limit=50
            )
            recent_memories = await self.redis_service.recall_memory(recall_data)
            
            # Analyze memory distribution
            memory_types = defaultdict(int)
            for memory in recent_memories:
                memory_types[memory.get('type', 'unknown')] += 1
            
            # Get most recent activities
            recent_activities = sorted(recent_memories, key=lambda x: x.get('timestamp', ''), reverse=True)[:5]
            
            return {
                'project_id': project_id,
                'total_memories': len(recent_memories),
                'memory_distribution': dict(memory_types),
                'recent_activities': recent_activities,
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting project context summary: {e}")
            return {
                'project_id': project_id,
                'total_memories': 0,
                'memory_distribution': {},
                'recent_activities': [],
                'last_updated': datetime.utcnow().isoformat()
            }
    
    # WebSocket Event Emission Methods
    
    async def _emit_context_analysis_start(self, project_id: str, user_input: str):
        """Emit context analysis start event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.CONTEXT_ANALYSIS_COMPLETE,
                {
                    "stage": "analysis_started",
                    "project_id": project_id,
                    "user_input_preview": user_input[:100] + "..." if len(user_input) > 100 else user_input,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting context analysis start event: {e}")
    
    async def _emit_key_terms_extracted(self, project_id: str, key_terms: List[str]):
        """Emit key terms extracted event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.CONTEXT_ANALYSIS_COMPLETE,
                {
                    "stage": "key_terms_extracted",
                    "project_id": project_id,
                    "key_terms": key_terms,
                    "term_count": len(key_terms),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting key terms extracted event: {e}")
    
    async def _emit_memories_retrieved(self, project_id: str, memory_count: int):
        """Emit memories retrieved event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.CONTEXT_ANALYSIS_COMPLETE,
                {
                    "stage": "memories_retrieved",
                    "project_id": project_id,
                    "memory_count": memory_count,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting memories retrieved event: {e}")
    
    async def _emit_context_analysis_complete(self, project_id: str, analysis: ContextAnalysis, processing_time: float):
        """Emit context analysis complete event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.CONTEXT_ANALYSIS_COMPLETE,
                {
                    "stage": "analysis_complete",
                    "project_id": project_id,
                    "context_score": analysis.context_score,
                    "completeness_score": analysis.completeness_score,
                    "confidence_score": analysis.confidence_score,
                    "relevant_memory_count": len(analysis.relevant_memories),
                    "processing_time": processing_time,
                    "suggested_actions": analysis.suggested_actions,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting context analysis complete event: {e}")
    
    async def _emit_context_analysis_error(self, project_id: str, error_message: str):
        """Emit context analysis error event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.ERROR_OCCURRED,
                {
                    "component": "context_engine",
                    "operation": "context_analysis",
                    "error": error_message,
                    "project_id": project_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting context analysis error event: {e}")
    
    async def _emit_memory_stored(self, project_id: str, memory_key: str, memory_data: Dict[str, Any]):
        """Emit memory stored event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.MEMORY_STORED,
                {
                    "memory_key": memory_key,
                    "memory_type": memory_data.get('type'),
                    "project_id": project_id,
                    "timestamp": memory_data.get('timestamp'),
                    "relevance_score": memory_data.get('relevance_score')
                }
            )
        except Exception as e:
            logger.error(f"Error emitting memory stored event: {e}")
    
    async def _emit_similar_issues_search_start(self, project_id: str, issue_description: str):
        """Emit similar issues search start event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.SIMILAR_ISSUES_FOUND,
                {
                    "stage": "search_started",
                    "project_id": project_id,
                    "issue_description": issue_description[:100] + "..." if len(issue_description) > 100 else issue_description,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting similar issues search start event: {e}")
    
    async def _emit_similar_issues_found(self, project_id: str, issue_description: str, similar_issues: List[Dict[str, Any]]):
        """Emit similar issues found event"""
        try:
            await self.websocket_service.broadcast_to_project(
                project_id,
                WebSocketEvents.SIMILAR_ISSUES_FOUND,
                {
                    "stage": "search_complete",
                    "project_id": project_id,
                    "issue_description": issue_description[:50] + "..." if len(issue_description) > 50 else issue_description,
                    "similar_issues_count": len(similar_issues),
                    "top_issue_types": [issue.get('type') for issue in similar_issues[:3]],
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error emitting similar issues found event: {e}")