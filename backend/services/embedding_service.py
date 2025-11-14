"""
Embedding service for generating vector embeddings for RAG
"""
import os
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
import asyncio

from backend.utils.convex_client import convex_service

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY not set. Embedding generation will fail.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split text into chunks with overlap.
    
    Args:
        text: Text to chunk
        chunk_size: Target chunk size in characters
        overlap: Overlap between chunks in characters
        
    Returns:
        List of text chunks
    """
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            for punct in ['. ', '.\n', '! ', '!\n', '? ', '?\n']:
                last_punct = chunk.rfind(punct)
                if last_punct > chunk_size * 0.7:  # Only break if we're past 70% of chunk
                    chunk = chunk[:last_punct + 1]
                    end = start + len(chunk)
                    break
        
        chunks.append(chunk.strip())
        start = end - overlap
    
    return chunks


async def generate_embedding(text: str, task_type: str = "retrieval_document") -> List[float]:
    """
    Generate embedding for text using Google's text-embedding-004 model.
    
    Args:
        text: Text to embed
        task_type: Type of task - "retrieval_document" for content, "retrieval_query" for queries
        
    Returns:
        List of floats representing the embedding vector (768 dimensions)
    """
    if not GOOGLE_API_KEY:
        raise ValueError("Google API key not initialized. Check GOOGLE_API_KEY.")
    
    try:
        # Use Google's embedding model
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type=task_type
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        raise


async def create_embeddings_for_content(
    workspace_id: str,
    content_id: str,
    roadmap_id: str,
    content_text: str,
    subtopic_id: str,
    subtopic_name: str,
    metadata: Optional[Dict[str, Any]] = None
) -> List[str]:
    """
    Create embeddings for content text and store in Convex.
    
    Args:
        workspace_id: Workspace ID
        content_id: Content ID
        roadmap_id: Roadmap ID
        content_text: Content text to embed
        subtopic_id: Subtopic ID
        subtopic_name: Subtopic name
        metadata: Additional metadata
        
    Returns:
        List of embedding IDs created
    """
    try:
        # Chunk the content
        chunks = chunk_text(content_text)
        
        # Generate embeddings for each chunk
        embeddings_data = []
        for i, chunk in enumerate(chunks):
            try:
                embedding = await generate_embedding(chunk)
                
                embeddings_data.append({
                    "workspaceId": workspace_id,
                    "contentId": content_id,
                    "roadmapId": roadmap_id,
                    "text": chunk,
                    "embedding": embedding,
                    "metadata": {
                        "type": "content",
                        "subtopicId": subtopic_id,
                        "subtopicName": subtopic_name,
                        "title": f"{subtopic_name} - Chunk {i+1}",
                        **(metadata or {}),
                    },
                })
            except Exception as e:
                logger.error(f"Error generating embedding for chunk {i}: {str(e)}")
                continue
        
        # Batch create embeddings in Convex
        if embeddings_data:
            embedding_ids = await convex_service.create_embeddings_batch(embeddings_data)
            logger.info(f"Created {len(embedding_ids)} embeddings for content {content_id}")
            return embedding_ids
        
        return []
    except Exception as e:
        logger.error(f"Error creating embeddings for content: {str(e)}")
        return []


async def create_embeddings_for_roadmap(
    workspace_id: str,
    roadmap_id: str,
    roadmap_json: Dict[str, Any],
    roadmap_title: str
) -> List[str]:
    """
    Create embeddings for roadmap structure and store in Convex.
    
    Args:
        workspace_id: Workspace ID
        roadmap_id: Roadmap ID
        roadmap_json: Roadmap JSON structure
        roadmap_title: Roadmap title
        
    Returns:
        List of embedding IDs created
    """
    try:
        embeddings_data = []
        
        # Create embedding for overall roadmap description
        roadmap_text = f"Roadmap: {roadmap_title}\n\n"
        roadmap_text += f"Teaching Style: {roadmap_json.get('TeachingStyle', 'mixed')}\n\n"
        
        # Add each subtopic
        for key, subtopic in roadmap_json.items():
            if key.startswith('Subtopic'):
                subtopic_text = f"Subtopic: {subtopic.get('TopicName', key)}\n"
                subtopic_text += f"Time to Complete: {subtopic.get('SuggestedTimeToComplete', 'N/A')}\n"
                
                if subtopic.get('ContentList', {}).get('topics'):
                    subtopic_text += "Topics: " + ", ".join(subtopic['ContentList']['topics']) + "\n"
                
                roadmap_text += subtopic_text + "\n"
        
        # Generate embedding for roadmap
        try:
            embedding = await generate_embedding(roadmap_text)
            embeddings_data.append({
                "workspaceId": workspace_id,
                "roadmapId": roadmap_id,
                "text": roadmap_text,
                "embedding": embedding,
                "metadata": {
                    "type": "roadmap",
                    "title": roadmap_title,
                },
            })
        except Exception as e:
            logger.error(f"Error generating roadmap embedding: {str(e)}")
        
        # Create embeddings for each subtopic individually
        for key, subtopic in roadmap_json.items():
            if key.startswith('Subtopic'):
                subtopic_name = subtopic.get('TopicName', key)
                subtopic_text = f"Subtopic: {subtopic_name}\n"
                subtopic_text += f"Time to Complete: {subtopic.get('SuggestedTimeToComplete', 'N/A')}\n"
                
                if subtopic.get('ContentList', {}).get('topics'):
                    subtopic_text += "Topics: " + ", ".join(subtopic['ContentList']['topics']) + "\n"
                
                # Add resources info
                content_list = subtopic.get('ContentList', {})
                if content_list.get('videos'):
                    subtopic_text += f"Videos: {len(content_list['videos'])} resources\n"
                if content_list.get('blogs'):
                    subtopic_text += f"Articles: {len(content_list['blogs'])} resources\n"
                
                try:
                    embedding = await generate_embedding(subtopic_text)
                    embeddings_data.append({
                        "workspaceId": workspace_id,
                        "roadmapId": roadmap_id,
                        "text": subtopic_text,
                        "embedding": embedding,
                        "metadata": {
                            "type": "roadmap",
                            "subtopicId": key,
                            "subtopicName": subtopic_name,
                            "title": subtopic_name,
                        },
                    })
                except Exception as e:
                    logger.error(f"Error generating subtopic embedding: {str(e)}")
        
        # Batch create embeddings
        if embeddings_data:
            embedding_ids = await convex_service.create_embeddings_batch(embeddings_data)
            logger.info(f"Created {len(embedding_ids)} embeddings for roadmap {roadmap_id}")
            return embedding_ids
        
        return []
    except Exception as e:
        logger.error(f"Error creating embeddings for roadmap: {str(e)}")
        return []


async def create_embeddings_for_quiz(
    workspace_id: str,
    content_id: str,
    roadmap_id: str,
    quiz: List[Dict[str, Any]],
    subtopic_id: str,
    subtopic_name: str
) -> List[str]:
    """
    Create embeddings for quiz questions and store in Convex.
    
    Args:
        workspace_id: Workspace ID
        content_id: Content ID
        roadmap_id: Roadmap ID
        quiz: List of quiz questions
        subtopic_id: Subtopic ID
        subtopic_name: Subtopic name
        
    Returns:
        List of embedding IDs created
    """
    try:
        embeddings_data = []
        
        for question in quiz:
            quiz_text = f"Question: {question.get('question', '')}\n"
            quiz_text += f"Options: {', '.join(question.get('options', []))}\n"
            if question.get('explanation'):
                quiz_text += f"Explanation: {question.get('explanation')}\n"
            
            try:
                embedding = await generate_embedding(quiz_text)
                embeddings_data.append({
                    "workspaceId": workspace_id,
                    "contentId": content_id,
                    "roadmapId": roadmap_id,
                    "text": quiz_text,
                    "embedding": embedding,
                    "metadata": {
                        "type": "quiz",
                        "subtopicId": subtopic_id,
                        "subtopicName": subtopic_name,
                        "title": f"Quiz: {subtopic_name}",
                    },
                })
            except Exception as e:
                logger.error(f"Error generating quiz embedding: {str(e)}")
                continue
        
        # Batch create embeddings
        if embeddings_data:
            embedding_ids = await convex_service.create_embeddings_batch(embeddings_data)
            logger.info(f"Created {len(embedding_ids)} embeddings for quiz in content {content_id}")
            return embedding_ids
        
        return []
    except Exception as e:
        logger.error(f"Error creating embeddings for quiz: {str(e)}")
        return []

