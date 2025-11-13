"""
Convex HTTP API client for FastAPI backend
"""
import os
import httpx
import logging
from typing import Optional, Dict, Any, List
import json

logger = logging.getLogger(__name__)

CONVEX_URL = os.getenv("CONVEX_URL", "")
CONVEX_DEPLOY_KEY = os.getenv("CONVEX_DEPLOY_KEY", "")

if not CONVEX_URL:
    logger.warning("CONVEX_URL not set. Convex operations will fail.")


class ConvexService:
    """Service for interacting with Convex database via HTTP API"""
    
    def __init__(self):
        self.base_url = CONVEX_URL.rstrip("/")
        self.deploy_key = CONVEX_DEPLOY_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def _call_mutation(self, function_name: str, args: Dict[str, Any]) -> Any:
        """Call a Convex mutation function"""
        if not self.base_url:
            raise ValueError("CONVEX_URL not configured")
        
        url = f"{self.base_url}/api/mutation/{function_name}"
        headers = {
            "Content-Type": "application/json",
        }
        
        # Add deploy key if available (for server-side calls)
        if self.deploy_key:
            headers["Authorization"] = f"Bearer {self.deploy_key}"
        
        try:
            response = await self.client.post(
                url,
                json=args,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Convex mutation error: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling Convex mutation {function_name}: {str(e)}")
            raise
    
    async def _call_query(self, function_name: str, args: Dict[str, Any]) -> Any:
        """Call a Convex query function"""
        if not self.base_url:
            raise ValueError("CONVEX_URL not configured")
        
        url = f"{self.base_url}/api/query/{function_name}"
        headers = {
            "Content-Type": "application/json",
        }
        
        if self.deploy_key:
            headers["Authorization"] = f"Bearer {self.deploy_key}"
        
        try:
            response = await self.client.post(
                url,
                json=args,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Convex query error: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling Convex query {function_name}: {str(e)}")
            raise
    
    # Workspace operations
    async def create_workspace(self, name: str, owner_id: str, description: Optional[str] = None) -> str:
        """Create a new workspace"""
        result = await self._call_mutation("workspaces:create", {
            "name": name,
            "description": description,
            "ownerId": owner_id,
        })
        return result
    
    async def get_workspace(self, workspace_id: str) -> Dict[str, Any]:
        """Get workspace by ID"""
        return await self._call_query("workspaces:get", {
            "workspaceId": workspace_id,
        })
    
    # Roadmap operations
    async def create_roadmap(
        self,
        workspace_id: str,
        title: str,
        roadmap_json: Dict[str, Any],
        teaching_style: str,
        created_by: str,
        status: str = "generating",
        session_id: Optional[str] = None,
        description: Optional[str] = None,
        uploaded_file_id: Optional[str] = None,
    ) -> str:
        """Create a new roadmap"""
        result = await self._call_mutation("roadmaps:create", {
            "workspaceId": workspace_id,
            "title": title,
            "description": description,
            "roadmapJson": roadmap_json,
            "teachingStyle": teaching_style,
            "status": status,
            "sessionId": session_id,
            "uploadedFileId": uploaded_file_id,
            "createdBy": created_by,
        })
        return result
    
    async def update_roadmap(
        self,
        roadmap_id: str,
        title: Optional[str] = None,
        roadmap_json: Optional[Dict[str, Any]] = None,
        status: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update a roadmap"""
        updates = {}
        if title is not None:
            updates["title"] = title
        if roadmap_json is not None:
            updates["roadmapJson"] = roadmap_json
        if status is not None:
            updates["status"] = status
        if description is not None:
            updates["description"] = description
        
        return await self._call_mutation("roadmaps:update", {
            "roadmapId": roadmap_id,
            **updates,
        })
    
    async def get_roadmap(self, roadmap_id: str) -> Dict[str, Any]:
        """Get roadmap by ID"""
        return await self._call_query("roadmaps:get", {
            "roadmapId": roadmap_id,
        })
    
    async def get_roadmap_by_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get roadmap by session ID"""
        return await self._call_query("roadmaps:getBySession", {
            "sessionId": session_id,
        })
    
    # Content operations
    async def create_content(
        self,
        workspace_id: str,
        roadmap_id: str,
        subtopic_id: str,
        subtopic_name: str,
        content: str,
        quiz: List[Dict[str, Any]],
        graphs: List[Dict[str, Any]],
        status: str = "completed",
        content_html: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> str:
        """Create content for a subtopic"""
        result = await self._call_mutation("content:create", {
            "workspaceId": workspace_id,
            "roadmapId": roadmap_id,
            "subtopicId": subtopic_id,
            "subtopicName": subtopic_name,
            "content": content,
            "contentHtml": content_html,
            "quiz": quiz,
            "graphs": graphs,
            "status": status,
            "errorMessage": error_message,
        })
        return result
    
    async def update_content(
        self,
        content_id: str,
        content: Optional[str] = None,
        quiz: Optional[List[Dict[str, Any]]] = None,
        graphs: Optional[List[Dict[str, Any]]] = None,
        status: Optional[str] = None,
        content_html: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update content"""
        updates = {}
        if content is not None:
            updates["content"] = content
        if quiz is not None:
            updates["quiz"] = quiz
        if graphs is not None:
            updates["graphs"] = graphs
        if status is not None:
            updates["status"] = status
        if content_html is not None:
            updates["contentHtml"] = content_html
        if error_message is not None:
            updates["errorMessage"] = error_message
        
        return await self._call_mutation("content:update", {
            "contentId": content_id,
            **updates,
        })
    
    async def get_content(self, content_id: str) -> Dict[str, Any]:
        """Get content by ID"""
        return await self._call_query("content:get", {
            "contentId": content_id,
        })
    
    async def get_content_by_roadmap_subtopic(
        self,
        roadmap_id: str,
        subtopic_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get content by roadmap and subtopic"""
        return await self._call_query("content:getByRoadmapSubtopic", {
            "roadmapId": roadmap_id,
            "subtopicId": subtopic_id,
        })
    
    # Embedding operations
    async def create_embedding(
        self,
        workspace_id: str,
        text: str,
        embedding: List[float],
        metadata: Dict[str, Any],
        content_id: Optional[str] = None,
        roadmap_id: Optional[str] = None,
    ) -> str:
        """Create a single embedding"""
        result = await self._call_mutation("embeddings:create", {
            "workspaceId": workspace_id,
            "contentId": content_id,
            "roadmapId": roadmap_id,
            "text": text,
            "embedding": embedding,
            "metadata": metadata,
        })
        return result
    
    async def create_embeddings_batch(
        self,
        embeddings: List[Dict[str, Any]],
    ) -> List[str]:
        """Create multiple embeddings in batch"""
        result = await self._call_mutation("embeddings:createBatch", {
            "embeddings": embeddings,
        })
        return result
    
    async def search_embeddings(
        self,
        workspace_id: str,
        query_embedding: List[float],
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Search for similar embeddings"""
        return await self._call_query("embeddings:search", {
            "workspaceId": workspace_id,
            "queryEmbedding": query_embedding,
            "limit": limit,
        })
    
    # Chat operations
    async def create_chat_message(
        self,
        workspace_id: str,
        user_id: str,
        message: str,
        response: str,
        context_chunks: List[Dict[str, Any]],
        citations: List[Dict[str, Any]],
    ) -> str:
        """Create a chat message"""
        result = await self._call_mutation("chat:create", {
            "workspaceId": workspace_id,
            "userId": user_id,
            "message": message,
            "response": response,
            "contextChunks": context_chunks,
            "citations": citations,
        })
        return result
    
    async def get_chat_messages(
        self,
        workspace_id: str,
        user_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get chat messages for a workspace and user"""
        return await self._call_query("chat:list", {
            "workspaceId": workspace_id,
            "userId": user_id,
            "limit": limit,
        })
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global instance
convex_service = ConvexService()

