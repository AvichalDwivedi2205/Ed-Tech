"""
Pydantic schemas for request/response validation
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# Roadmap Generator Schemas
class RoadmapGenerateRequest(BaseModel):
    """Request schema for roadmap generation"""
    user_input: str = Field(..., description="User's learning request")
    conversation_history: Optional[List[Dict[str, str]]] = Field(None, description="Previous conversation messages")
    session_id: Optional[str] = Field(None, description="Session ID for multi-turn conversations")


class RoadmapClarifyRequest(BaseModel):
    """Request schema for clarification response"""
    user_response: str = Field(..., description="User's response to clarification question")
    session_id: str = Field(..., description="Session ID")


class RoadmapResponse(BaseModel):
    """Response schema for roadmap generation"""
    roadmap: str = Field(..., description="Generated roadmap text")
    roadmap_json: Optional[Dict[str, Any]] = Field(None, description="Parsed roadmap JSON")
    actions: List[Dict[str, Any]] = Field(default_factory=list, description="Agent actions")
    waiting_for_response: bool = Field(False, description="Whether waiting for user response")
    session_id: Optional[str] = Field(None, description="Session ID")
    clarification_count: int = Field(0, description="Number of clarification questions asked")


class RoadmapStatusResponse(BaseModel):
    """Response schema for roadmap status"""
    status: str = Field(..., description="Status: pending, processing, completed, error")
    progress: float = Field(0.0, ge=0.0, le=100.0, description="Progress percentage")
    actions: List[Dict[str, Any]] = Field(default_factory=list, description="Latest actions")
    message: Optional[str] = Field(None, description="Status message")


# Content Creator Schemas
class ContentGenerateRequest(BaseModel):
    """Request schema for content generation"""
    roadmap_json: Dict[str, Any] = Field(..., description="Roadmap JSON")
    subtopic_id: Optional[str] = Field(None, description="Specific subtopic ID to generate (if None, generates next incomplete)")


class ContentResponse(BaseModel):
    """Response schema for content generation"""
    content: str = Field(..., description="Generated content")
    quiz: List[Dict[str, Any]] = Field(default_factory=list, description="Generated quiz questions")
    graphs: List[Dict[str, Any]] = Field(default_factory=list, description="Generated graphs")
    actions: List[Dict[str, Any]] = Field(default_factory=list, description="Agent actions")
    subtopic_id: str = Field(..., description="Subtopic ID that was processed")
    task_id: Optional[str] = Field(None, description="Task ID for progress tracking")


class ContentProgressResponse(BaseModel):
    """Response schema for content generation progress"""
    status: str = Field(..., description="Status: pending, processing, completed, error")
    progress: float = Field(0.0, ge=0.0, le=100.0, description="Progress percentage")
    current_step: str = Field("", description="Current processing step")
    actions: List[Dict[str, Any]] = Field(default_factory=list, description="Latest actions")
    message: Optional[str] = Field(None, description="Status message")


class CompletedSubtopicsResponse(BaseModel):
    """Response schema for completed subtopics"""
    completed_subtopics: List[str] = Field(default_factory=list, description="List of completed subtopic IDs")
    context_summary: str = Field("", description="Context summary")


class MegaQuizResponse(BaseModel):
    """Response schema for mega quiz"""
    questions: List[Dict[str, Any]] = Field(default_factory=list, description="Quiz questions")
    num_questions: int = Field(0, description="Number of questions")


class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = Field(True, description="Success status")
    message: Optional[str] = Field(None, description="Optional message")


class ErrorResponse(BaseModel):
    """Error response schema"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Error details")

