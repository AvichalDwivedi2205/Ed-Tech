"""
Service layer for Content Creator Agent
"""
import asyncio
import logging
from typing import Dict, Any, Optional

from backend.agents import ContentCreatorAgent
from backend.utils.background_tasks import task_manager, TaskStatus
from backend.utils.convex_client import convex_service
from backend.services.embedding_service import (
    create_embeddings_for_content,
    create_embeddings_for_quiz,
)

logger = logging.getLogger(__name__)


class ContentService:
    """Service for content generation operations"""
    
    def __init__(self):
        self.agents: Dict[str, ContentCreatorAgent] = {}
    
    def get_agent(self, session_id: Optional[str] = None) -> ContentCreatorAgent:
        """Get or create agent instance for session"""
        if session_id and session_id in self.agents:
            return self.agents[session_id]
        
        agent = ContentCreatorAgent()
        if session_id:
            self.agents[session_id] = agent
        return agent
    
    async def generate_content_async(
        self,
        roadmap_json: Dict[str, Any],
        workspace_id: Optional[str] = None,
        roadmap_id: Optional[str] = None,
        subtopic_id: Optional[str] = None,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate content asynchronously with progress tracking"""
        if task_id:
            task_manager.set_status(task_id, TaskStatus.PROCESSING)
            task_manager.update_task(task_id, progress=5.0, current_step="Initializing...")
        
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._generate_content_sync,
            roadmap_json,
            subtopic_id,
            session_id,
            task_id
        )
        
        # Write to Convex if workspace_id and roadmap_id are provided
        if workspace_id and roadmap_id and result.get("content"):
            try:
                subtopic_id_result = result.get("subtopic_id", subtopic_id)
                if subtopic_id_result:
                    # Get subtopic name from roadmap
                    subtopic_data = roadmap_json.get(subtopic_id_result, {})
                    subtopic_name = subtopic_data.get("TopicName", subtopic_id_result)
                    
                    # Create or update content in Convex
                    existing_content = await convex_service.get_content_by_roadmap_subtopic(
                        roadmap_id=roadmap_id,
                        subtopic_id=subtopic_id_result
                    )
                    
                    if existing_content:
                        # Update existing content
                        await convex_service.update_content(
                            content_id=existing_content["_id"],
                            content=result.get("content", ""),
                            quiz=result.get("quiz", []),
                            graphs=result.get("graphs", []),
                            status="completed"
                        )
                        result["content_id"] = existing_content["_id"]
                    else:
                        # Create new content
                        content_id = await convex_service.create_content(
                            workspace_id=workspace_id,
                            roadmap_id=roadmap_id,
                            subtopic_id=subtopic_id_result,
                            subtopic_name=subtopic_name,
                            content=result.get("content", ""),
                            quiz=result.get("quiz", []),
                            graphs=result.get("graphs", []),
                            status="completed"
                        )
                        result["content_id"] = content_id
                        
                        # Generate embeddings for content and quiz (async, don't wait)
                        try:
                            asyncio.create_task(
                                create_embeddings_for_content(
                                    workspace_id=workspace_id,
                                    content_id=content_id,
                                    roadmap_id=roadmap_id,
                                    content_text=result.get("content", ""),
                                    subtopic_id=subtopic_id_result,
                                    subtopic_name=subtopic_name,
                                )
                            )
                            
                            if result.get("quiz"):
                                asyncio.create_task(
                                    create_embeddings_for_quiz(
                                        workspace_id=workspace_id,
                                        content_id=content_id,
                                        roadmap_id=roadmap_id,
                                        quiz=result.get("quiz", []),
                                        subtopic_id=subtopic_id_result,
                                        subtopic_name=subtopic_name,
                                    )
                                )
                        except Exception as e:
                            logger.warning(f"Failed to create embeddings: {str(e)}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to save content to Convex: {str(e)}")
                # Don't fail the request if Convex save fails
        
        if task_id:
            task_manager.set_result(task_id, result)
        
        return result
    
    def _generate_content_sync(
        self,
        roadmap_json: Dict[str, Any],
        subtopic_id: Optional[str] = None,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Synchronous content generation (runs in thread pool)"""
        try:
            agent = self.get_agent(session_id)
            
            # Set roadmap in context manager
            agent.context_manager.set_roadmap(roadmap_json)
            
            # Determine subtopic to process
            if not subtopic_id:
                completed_ids = agent.context_manager.get_completed_subtopic_ids()
                all_subtopics = [k for k in roadmap_json.keys() if k.startswith("Subtopic")]
                
                for st_id in sorted(all_subtopics, key=lambda x: int(x.replace("Subtopic", ""))):
                    if st_id not in completed_ids:
                        subtopic_id = st_id
                        break
                
                if not subtopic_id:
                    return {
                        "content": "",
                        "quiz": [],
                        "graphs": [],
                        "actions": [{"type": "info", "message": "All subtopics completed!"}],
                        "subtopic_id": "",
                        "error": "All subtopics already completed"
                    }
            
            if task_id:
                task_manager.update_task(task_id, progress=10.0, current_step="Loading roadmap...")
            
            # Create initial state
            initial_state = {
                "roadmap_json": roadmap_json,
                "messages": [],
                "actions": [],
                "content_complete": False
            }
            
            # Track progress through nodes
            def progress_callback(step: str, progress: float):
                if task_id:
                    task_manager.update_task(
                        task_id,
                        progress=progress,
                        current_step=step
                    )
                    task_manager.add_action(task_id, {"type": "info", "message": step})
            
            # Run agent graph
            result = agent.graph.invoke(initial_state)
            
            # Extract results
            content = result.get("generated_content", "")
            quiz = result.get("generated_quiz", [])
            graphs = result.get("generated_graphs", [])
            actions = result.get("actions", [])
            processed_subtopic_id = result.get("current_subtopic_id", subtopic_id)
            
            return {
                "content": content,
                "quiz": quiz,
                "graphs": graphs,
                "actions": actions,
                "subtopic_id": processed_subtopic_id or subtopic_id
            }
        except Exception as e:
            error_msg = str(e)
            if task_id:
                task_manager.set_status(task_id, TaskStatus.ERROR, error=error_msg)
            
            return {
                "content": "",
                "quiz": [],
                "graphs": [],
                "actions": [{"type": "error", "message": error_msg}],
                "subtopic_id": subtopic_id or "",
                "error": error_msg
            }
    
    async def get_completed_subtopics_async(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get list of completed subtopics"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._get_completed_subtopics_sync,
            session_id
        )
    
    def _get_completed_subtopics_sync(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Synchronous get completed subtopics"""
        try:
            agent = self.get_agent(session_id)
            completed_ids = agent.context_manager.get_completed_subtopic_ids()
            context_summary = agent.context_manager.get_context_summary()
            
            return {
                "completed_subtopics": completed_ids,
                "context_summary": context_summary
            }
        except Exception as e:
            return {
                "completed_subtopics": [],
                "context_summary": "",
                "error": str(e)
            }
    
    async def reset_context_async(self, session_id: Optional[str] = None) -> bool:
        """Reset context manager"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._reset_context_sync,
            session_id
        )
    
    def _reset_context_sync(self, session_id: Optional[str] = None) -> bool:
        """Synchronous reset context"""
        try:
            agent = self.get_agent(session_id)
            agent.context_manager.reset_context()
            return True
        except Exception as e:
            return False
    
    async def generate_mega_quiz_async(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Generate mega quiz asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._generate_mega_quiz_sync,
            session_id
        )
    
    def _generate_mega_quiz_sync(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Synchronous mega quiz generation"""
        try:
            agent = self.get_agent(session_id)
            mega_quiz = agent.generate_mega_quiz()
            
            if "error" in mega_quiz:
                return {
                    "questions": [],
                    "num_questions": 0,
                    "error": mega_quiz.get("error")
                }
            
            questions = mega_quiz.get("questions", [])
            return {
                "questions": questions,
                "num_questions": len(questions)
            }
        except Exception as e:
            return {
                "questions": [],
                "num_questions": 0,
                "error": str(e)
            }
    
    def cleanup_session(self, session_id: str):
        """Clean up session resources"""
        if session_id in self.agents:
            del self.agents[session_id]


# Global service instance
content_service = ContentService()

