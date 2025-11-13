"""
Service layer for Roadmap Generator Agent
"""
import asyncio
import tempfile
import os
from typing import Dict, Any, Optional
from pathlib import Path

from backend.agents import RoadmapGeneratorAgent
from langchain_core.messages import HumanMessage, AIMessage
from backend.utils.background_tasks import task_manager, TaskStatus
from backend.utils.convex_client import convex_service
from backend.services.embedding_service import create_embeddings_for_roadmap
import logging

logger = logging.getLogger(__name__)


class RoadmapService:
    """Service for roadmap generation operations"""
    
    def __init__(self):
        self.agents: Dict[str, RoadmapGeneratorAgent] = {}
        self.session_states: Dict[str, Dict[str, Any]] = {}  # Store conversation state per session
    
    def get_agent(self, session_id: Optional[str] = None) -> RoadmapGeneratorAgent:
        """Get or create agent instance for session"""
        if session_id and session_id in self.agents:
            return self.agents[session_id]
        
        agent = RoadmapGeneratorAgent()
        if session_id:
            self.agents[session_id] = agent
        return agent
    
    async def generate_roadmap_async(
        self,
        user_input: str,
        workspace_id: Optional[str] = None,
        user_id: Optional[str] = None,
        file_path: Optional[str] = None,
        ocr_text: Optional[str] = None,
        conversation_history: Optional[list] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate roadmap asynchronously"""
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._generate_roadmap_sync,
            user_input,
            file_path,
            ocr_text,
            conversation_history,
            session_id
        )
        
        # Write to Convex if workspace_id and user_id are provided
        if workspace_id and user_id and result.get("roadmap_json"):
            try:
                roadmap_json = result.get("roadmap_json")
                teaching_style = roadmap_json.get("TeachingStyle", "mixed")
                title = f"Roadmap: {user_input[:50]}"
                
                # Create or update roadmap in Convex
                if session_id:
                    # Check if roadmap already exists for this session
                    existing_roadmap = await convex_service.get_roadmap_by_session(session_id)
                    if existing_roadmap:
                        # Update existing roadmap
                        await convex_service.update_roadmap(
                            roadmap_id=existing_roadmap["_id"],
                            roadmap_json=roadmap_json,
                            status="completed"
                        )
                        result["roadmap_id"] = existing_roadmap["_id"]
                    else:
                        # Create new roadmap
                        roadmap_id = await convex_service.create_roadmap(
                            workspace_id=workspace_id,
                            title=title,
                            roadmap_json=roadmap_json,
                            teaching_style=teaching_style,
                            created_by=user_id,
                            status="completed",
                            session_id=session_id
                        )
                        result["roadmap_id"] = roadmap_id
                        
                        # Generate embeddings for roadmap (async, don't wait)
                        try:
                            asyncio.create_task(
                                create_embeddings_for_roadmap(
                                    workspace_id=workspace_id,
                                    roadmap_id=roadmap_id,
                                    roadmap_json=roadmap_json,
                                    roadmap_title=title,
                                )
                            )
                        except Exception as e:
                            logger.warning(f"Failed to create roadmap embeddings: {str(e)}")
                else:
                    # Create new roadmap without session
                    roadmap_id = await convex_service.create_roadmap(
                        workspace_id=workspace_id,
                        title=title,
                        roadmap_json=roadmap_json,
                        teaching_style=teaching_style,
                        created_by=user_id,
                        status="completed"
                    )
                    result["roadmap_id"] = roadmap_id
                    
                    # Generate embeddings for roadmap (async, don't wait)
                    try:
                        asyncio.create_task(
                            create_embeddings_for_roadmap(
                                workspace_id=workspace_id,
                                roadmap_id=roadmap_id,
                                roadmap_json=roadmap_json,
                                roadmap_title=title,
                            )
                        )
                    except Exception as e:
                        logger.warning(f"Failed to create roadmap embeddings: {str(e)}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to save roadmap to Convex: {str(e)}")
                # Don't fail the request if Convex save fails
        
        return result
    
    def _generate_roadmap_sync(
        self,
        user_input: str,
        file_path: Optional[str] = None,
        ocr_text: Optional[str] = None,
        conversation_history: Optional[list] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Synchronous roadmap generation (runs in thread pool)"""
        try:
            agent = self.get_agent(session_id)
            
            # Get or create session state
            if session_id and session_id in self.session_states:
                session_state = self.session_states[session_id]
                # Continue from previous state - restore previous messages
                previous_messages = session_state.get("messages", [])
                clarification_count = session_state.get("clarification_count", 0)
                roadmap_context = session_state.get("roadmap_context", "")
            else:
                previous_messages = []
                clarification_count = 0
                roadmap_context = ""
            
            # Build messages from conversation history if provided, otherwise use previous messages
            messages = []
            if conversation_history:
                # Use provided conversation history
                for msg in conversation_history:
                    if msg.get("role") == "user":
                        messages.append(HumanMessage(content=msg.get("content", "")))
                    elif msg.get("role") == "assistant":
                        messages.append(AIMessage(content=msg.get("content", "")))
            else:
                # Use previous messages from session state
                messages = previous_messages.copy() if previous_messages else []
            
            # Add current user input if it's different from the last message
            if not messages or (isinstance(messages[-1], HumanMessage) and messages[-1].content != user_input):
                messages.append(HumanMessage(content=user_input))
            
            # Create initial state (continue from previous if exists)
            initial_state = {
                "messages": messages,
                "clarification_count": clarification_count,
                "user_input": user_input,
                "file_path": file_path,
                "ocr_text": ocr_text or "",
                "roadmap_context": roadmap_context,
                "actions": [],
                "final_roadmap": "",
                "waiting_for_response": False
            }
            
            # Run agent graph
            result = agent.graph.invoke(initial_state)
            
            # Save session state for next request
            if session_id:
                self.session_states[session_id] = {
                    "messages": result.get("messages", []),
                    "clarification_count": result.get("clarification_count", 0),
                    "roadmap_context": result.get("roadmap_context", roadmap_context),
                    "waiting_for_response": result.get("waiting_for_response", False)
                }
            
            # Extract roadmap JSON if possible
            roadmap_json = None
            roadmap_text = result.get("final_roadmap", "")
            
            if roadmap_text:
                try:
                    import json
                    # Try to parse as JSON
                    roadmap_json = json.loads(roadmap_text)
                    # Clear session state if roadmap was successfully generated
                    if session_id and session_id in self.session_states:
                        del self.session_states[session_id]
                except:
                    pass
            
            return {
                "roadmap": roadmap_text,
                "roadmap_json": roadmap_json,
                "actions": result.get("actions", []),
                "waiting_for_response": result.get("waiting_for_response", False),
                "clarification_count": result.get("clarification_count", 0),
                "messages": [
                    {
                        "role": "assistant" if isinstance(m, AIMessage) else "user",
                        "content": m.content
                    }
                    for m in result.get("messages", [])
                    if isinstance(m, (AIMessage, HumanMessage))
                ]
            }
        except Exception as e:
            return {
                "roadmap": "",
                "roadmap_json": None,
                "actions": [{"type": "error", "message": str(e)}],
                "waiting_for_response": False,
                "clarification_count": 0,
                "error": str(e)
            }
    
    async def process_file_upload(self, file_content: bytes, filename: str) -> str:
        """Process uploaded file and return file path"""
        # Create temporary file
        file_ext = Path(filename).suffix.lower()
        allowed_extensions = {".png", ".jpg", ".jpeg", ".pdf", ".webp"}
        
        if file_ext not in allowed_extensions:
            raise ValueError(f"File type {file_ext} not allowed")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name
        
        return tmp_path
    
    def cleanup_session(self, session_id: str):
        """Clean up session resources"""
        if session_id in self.agents:
            del self.agents[session_id]
        if session_id in self.session_states:
            del self.session_states[session_id]


# Global service instance
roadmap_service = RoadmapService()

