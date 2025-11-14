"""
Mini-Drona Q&A API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel, Field

from backend.middleware.clerk_auth import verify_clerk_token
from backend.utils.convex_client import convex_service
from backend.services.embedding_service import generate_embedding
from langchain_google_genai import ChatGoogleGenerativeAI
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/qa", tags=["qa"])


class QARequest(BaseModel):
    """Request schema for Q&A"""
    question: str = Field(..., description="User's question")
    workspace_id: str = Field(..., description="Workspace ID")


class QAResponse(BaseModel):
    """Response schema for Q&A"""
    answer: str = Field(..., description="AI-generated answer")
    citations: List[Dict[str, Any]] = Field(default_factory=list, description="Source citations")
    context_used: List[str] = Field(default_factory=list, description="Context chunks used")


@router.post("/ask", response_model=QAResponse)
async def ask_question(
    request: QARequest,
    user: dict = Depends(verify_clerk_token)
):
    """
    Answer a question using RAG (Retrieval-Augmented Generation).
    
    Uses vector search to find relevant content, then generates an answer using LLM.
    """
    try:
        user_id = user.get("sub")
        
        # Generate embedding for the question (use retrieval_query for search queries)
        question_embedding = await generate_embedding(request.question, task_type="retrieval_query")
        
        # Search for similar content in Convex
        search_results = await convex_service.search_embeddings(
            workspace_id=request.workspace_id,
            query_embedding=question_embedding,
            limit=5
        )
        
        if not search_results:
            return QAResponse(
                answer="I couldn't find any relevant information in this workspace to answer your question. Please try rephrasing or ensure content has been generated for this workspace.",
                citations=[],
                context_used=[]
            )
        
        # Build context from search results
        context_chunks = []
        citations = []
        
        for result in search_results:
            text = result.get("text", "")
            metadata = result.get("metadata", {})
            context_chunks.append(text)
            
            citations.append({
                "text": text[:200] + "..." if len(text) > 200 else text,
                "type": metadata.get("type", "unknown"),
                "subtopicName": metadata.get("subtopicName"),
                "title": metadata.get("title"),
                "relevanceScore": result.get("_score", 0.0),
            })
        
        context = "\n\n---\n\n".join(context_chunks)
        
        # Generate answer using LLM
        prompt = f"""You are a helpful AI assistant answering questions about learning content in a workspace.

Context from workspace:
{context}

Question: {request.question}

Answer the question based on the context provided above. Be specific and cite which subtopic or section the information comes from. If the answer isn't in the context, say so clearly.

Answer:"""

        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
        response = llm.invoke(prompt)
        answer = response.content if hasattr(response, 'content') else str(response)
        
        # Save to chat history in Convex
        try:
            await convex_service.create_chat_message(
                workspace_id=request.workspace_id,
                user_id=user_id,
                message=request.question,
                response=answer,
                context_chunks=[
                    {
                        "text": chunk,
                        "type": citations[i].get("type", "unknown"),
                        "subtopicName": citations[i].get("subtopicName"),
                    }
                    for i, chunk in enumerate(context_chunks)
                ],
                citations=citations,
            )
        except Exception as e:
            logger.warning(f"Failed to save chat message: {str(e)}")
        
        return QAResponse(
            answer=answer,
            citations=citations,
            context_used=context_chunks
        )
        
    except Exception as e:
        logger.error(f"Error in Q&A: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")


@router.get("/history/{workspace_id}")
async def get_chat_history(
    workspace_id: str,
    limit: int = 50,
    user: dict = Depends(verify_clerk_token)
):
    """Get chat history for a workspace"""
    try:
        user_id = user.get("sub")
        messages = await convex_service.get_chat_messages(
            workspace_id=workspace_id,
            user_id=user_id,
            limit=limit
        )
        return {"messages": messages}
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting chat history: {str(e)}")

