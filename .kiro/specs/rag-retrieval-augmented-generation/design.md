# Design Document

## Overview

This design implements Retrieval-Augmented Generation (RAG) using Convex vector search. The system processes documents, creates embeddings, and retrieves relevant context for AI agents.

## Architecture

### RAG Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│  Document   │───►│  Chunking    │───►│  Embedding  │───►│  Vector DB  │
│  Upload     │    │  Service     │    │  Service    │    │  Convex     │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                                                                    │
                                                                    ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│  Content    │◄───│  RAG        │◄───│  Semantic   │◄───│  Query      │
│  Generation │    │  Service    │    │  Search     │    │  Embedding  │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

## Components and Interfaces

### RAGService

```typescript
export class RAGService {
  async processDocument(
    file: File,
    workspaceId: string,
    namespace: string
  ): Promise<void>
  
  async retrieveContext(
    query: string,
    workspaceId: string,
    namespace: string,
    limit?: number
  ): Promise<Chunk[]>
}
```

### Document Processing

```typescript
// Document chunking
async function chunkDocument(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<Chunk[]>

// Embedding generation
async function generateEmbedding(
  text: string
): Promise<number[]>

// Vector search
async function searchSimilar(
  queryEmbedding: number[],
  workspaceId: string,
  namespace: string,
  limit: number = 5
): Promise<Chunk[]>
```

## Data Models

### documents Table

```typescript
documents: defineTable({
  workspaceId: v.id("workspaces"),
  ragNamespace: v.string(),
  title: v.string(),
  sourcePath: v.optional(v.string()),
  storageId: v.optional(v.id("_storage")),
  pageCount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("indexed"),
    v.literal("skipped_page_limit"),
    v.literal("failed")
  ),
  hash: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### chunks Table

```typescript
chunks: defineTable({
  docId: v.id("documents"),
  workspaceId: v.id("workspaces"),
  ragNamespace: v.string(),
  chunkIndex: v.number(),
  pageStart: v.number(),
  pageEnd: v.number(),
  text: v.string(),
  embedding: v.array(v.number()),
  metadata: v.any(),
})
.vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 768,
  filterFields: ["workspaceId", "ragNamespace"],
})
```

## Testing Strategy

### Unit Tests

- Document chunking logic
- Embedding generation
- Vector search queries
- RAG context retrieval

### Integration Tests

- End-to-end document processing
- RAG retrieval during content generation
- Vector search performance

## Performance Optimizations

### Processing Optimization

1. **Async Processing**: Process documents asynchronously
2. **Batch Embeddings**: Generate embeddings in batches
3. **Caching**: Cache embeddings for repeated queries

### Search Optimization

1. **Indexed Search**: Use vector indexes for fast retrieval
2. **Filtering**: Filter by workspace and namespace
3. **Limit Results**: Limit retrieved chunks to relevant top-K

