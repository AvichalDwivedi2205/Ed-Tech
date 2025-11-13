"""
Roadmap Generator API routes
"""
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models.schemas import (
    RoadmapGenerateRequest,
    RoadmapClarifyRequest,
    RoadmapResponse,
    RoadmapStatusResponse,
    ErrorResponse
)
from backend.services.roadmap_service import roadmap_service

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    user_input: str = Form(...),
    file: Optional[UploadFile] = File(None),
    session_id: Optional[str] = Form(None),
    conversation_history: Optional[str] = Form(None)
):
    """Generate roadmap from user input with optional file upload"""
    try:
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Process file upload if provided
        file_path = None
        ocr_text = None
        
        if file:
            # Read file content
            file_content = await file.read()
            
            # Validate file size (10MB max)
            if len(file_content) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
            
            # Process file
            file_path = await roadmap_service.process_file_upload(file_content, file.filename)
        
        # Parse conversation history if provided
        import json
        history = None
        if conversation_history:
            try:
                history = json.loads(conversation_history)
            except:
                pass
        
        # Generate roadmap
        result = await roadmap_service.generate_roadmap_async(
            user_input=user_input,
            file_path=file_path,
            conversation_history=history,
            session_id=session_id
        )
        
        # Clean up temporary file
        if file_path:
            import os
            try:
                os.unlink(file_path)
            except:
                pass
        
        # Check for errors
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return RoadmapResponse(
            roadmap=result.get("roadmap", ""),
            roadmap_json=result.get("roadmap_json"),
            actions=result.get("actions", []),
            waiting_for_response=result.get("waiting_for_response", False),
            session_id=session_id,
            clarification_count=result.get("clarification_count", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")


@router.post("/clarify", response_model=RoadmapResponse)
async def clarify_roadmap(request: RoadmapClarifyRequest):
    """Continue clarification conversation"""
    try:
        # Generate roadmap with user response
        result = await roadmap_service.generate_roadmap_async(
            user_input=request.user_response,
            conversation_history=None,  # Will be handled by agent's state
            session_id=request.session_id
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return RoadmapResponse(
            roadmap=result.get("roadmap", ""),
            roadmap_json=result.get("roadmap_json"),
            actions=result.get("actions", []),
            waiting_for_response=result.get("waiting_for_response", False),
            session_id=request.session_id,
            clarification_count=result.get("clarification_count", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing clarification: {str(e)}")


@router.get("/status/{session_id}", response_model=RoadmapStatusResponse)
async def get_roadmap_status(session_id: str):
    """Get roadmap generation status (placeholder for future implementation)"""
    # For now, return a simple status
    # In future, can track status via task manager
    return RoadmapStatusResponse(
        status="completed",
        progress=100.0,
        actions=[],
        message="Roadmap generation completed"
    )

