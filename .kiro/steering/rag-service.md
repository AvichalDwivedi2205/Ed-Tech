---
inclusion: always
---

# RAG Service Guidelines

This document outlines how the RAG (Retrieval-Augmented Generation) service works in OpenT.

## RAG Overview

RAG enhances content generation by retrieving relevant context from uploaded documents. The system processes documents, creates embeddings, and performs semantic search to find relevant information.

## Document Processing Pipeline

1. **Upload**: User uploads document to workspace
2. **Text Extraction**: Extract text from PDFs or images (OCR)
3. **Chunking**: Split document into manageable chunks (1000 chars, 200 overlap)
4. **Embedding**: Generate vector embeddings for each chunk
5. **Storage**: Store chunks with embeddings in Convex vector database
6. **Indexing**: Index by workspace and namespace for filtering

## RAG Service Usage

### Processing Documents

```typescript
import { RAGService } from "@/services/rag_service";

const ragService = new RAGService();
await ragService.processDocument(file, workspaceId, namespace);
```

### Retrieving Context

```typescript
const context = await ragService.retrieveContext(
  query,
  workspaceId,
  namespace,
  limit = 5
);
```

## Vector Search

Convex provides vector search capabilities:
- **Dimensions**: 768 (embedding dimensions)
- **Index**: `by_embedding` with filters on `workspaceId` and `ragNamespace`
- **Top-K**: Retrieve top-K most similar chunks

## Best Practices

1. **Chunking**: Preserve sentence boundaries and context
2. **Embeddings**: Use consistent embedding model
3. **Filtering**: Always filter by workspace and namespace
4. **Limits**: Limit retrieved chunks to prevent token overflow
5. **Error Handling**: Gracefully handle RAG failures in agents

## Integration with Agents

Agents use RAG context by:
1. Retrieving relevant chunks for the query
2. Incorporating chunks into agent prompts
3. Citing document sources in generated content
4. Handling cases where no relevant chunks exist

