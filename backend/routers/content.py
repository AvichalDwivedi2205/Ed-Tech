"""
Content Creator API routes
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models.schemas import (
    ContentGenerateRequest,
    ContentResponse,
    ContentProgressResponse,
    CompletedSubtopicsResponse,
    MegaQuizResponse,
    SuccessResponse,
    ErrorResponse
)
from backend.services.content_service import content_service
from backend.utils.background_tasks import task_manager, TaskStatus
from backend.middleware.clerk_auth import verify_clerk_token

router = APIRouter(prefix="/content", tags=["content"])


@router.post("/generate", response_model=ContentResponse)
async def generate_content(
    request: ContentGenerateRequest,
    workspace_id: str = Query(..., description="Workspace ID"),
    roadmap_id: str = Query(..., description="Roadmap ID"),
    user: dict = Depends(verify_clerk_token)
):
    """Generate content for a subtopic"""
    try:
        # Create task for progress tracking
        task_id = task_manager.create_task({
            "status": TaskStatus.PROCESSING,
            "progress": 0.0,
            "current_step": "Starting content generation..."
        })
        
        # Generate content asynchronously
        result = await content_service.generate_content_async(
            roadmap_json=request.roadmap_json,
            workspace_id=workspace_id,
            roadmap_id=roadmap_id,
            subtopic_id=request.subtopic_id,
            task_id=task_id
        )
        
        if "error" in result:
            task_manager.set_status(task_id, TaskStatus.ERROR, error=result["error"])
            raise HTTPException(status_code=500, detail=result["error"])
        
        return ContentResponse(
            content=result.get("content", ""),
            quiz=result.get("quiz", []),
            graphs=result.get("graphs", []),
            actions=result.get("actions", []),
            subtopic_id=result.get("subtopic_id", ""),
            task_id=task_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")


@router.get("/progress/{task_id}", response_model=ContentProgressResponse)
async def get_content_progress(task_id: str):
    """Get content generation progress"""
    task = task_manager.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return ContentProgressResponse(
        status=task["status"],
        progress=task["progress"],
        current_step=task["current_step"],
        actions=task.get("actions", []),
        message=task.get("error")
    )


@router.get("/completed", response_model=CompletedSubtopicsResponse)
async def get_completed_subtopics(session_id: Optional[str] = None):
    """Get list of completed subtopics"""
    try:
        result = await content_service.get_completed_subtopics_async(session_id=session_id)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return CompletedSubtopicsResponse(
            completed_subtopics=result.get("completed_subtopics", []),
            context_summary=result.get("context_summary", "")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting completed subtopics: {str(e)}")


@router.post("/reset-context", response_model=SuccessResponse)
async def reset_context(session_id: Optional[str] = None):
    """Reset context manager"""
    try:
        success = await content_service.reset_context_async(session_id=session_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reset context")
        
        return SuccessResponse(success=True, message="Context reset successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting context: {str(e)}")


@router.post("/mega-quiz", response_model=MegaQuizResponse)
async def generate_mega_quiz(session_id: Optional[str] = None):
    """Generate mega quiz covering all subtopics"""
    try:
        result = await content_service.generate_mega_quiz_async(session_id=session_id)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return MegaQuizResponse(
            questions=result.get("questions", []),
            num_questions=result.get("num_questions", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating mega quiz: {str(e)}")

