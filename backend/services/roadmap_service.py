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

