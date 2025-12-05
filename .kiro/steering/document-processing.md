---
inclusion: always
---

# Document Processing Guidelines

This document outlines how documents are processed in OpenT for RAG functionality.

## Document Types

### Supported Formats
- **PDF**: Text extraction from all pages
- **Images**: OCR for PNG, JPG formats
- **Text Files**: Direct text processing

## Processing Pipeline

### 1. Text Extraction

#### PDF Processing
```typescript
// Extract text from PDF
const text = await extractPDFText(file);
// Returns: { text: string, pages: number }
```

#### OCR Processing
```typescript
// Extract text from images
const ocrResult = await ocrTool.extractText(imageFile);
// Returns: { text: string, confidence: number }
```

### 2. Document Chunking

```typescript
// Chunk document intelligently
const chunks = await chunkDocument(text, {
  chunkSize: 1000,
  overlap: 200,
  preserveBoundaries: true
});
```

**Chunking Strategy**:
- Split at sentence boundaries
- Include overlap between chunks
- Preserve page references
- Maintain context

### 3. Embedding Generation

```typescript
// Generate embeddings for chunks
const embeddings = await generateEmbeddings(chunks);
// Returns: number[][] (array of embedding vectors)
```

### 4. Storage

```typescript
// Store chunks with embeddings
await storeChunks(chunks, embeddings, {
  workspaceId,
  namespace,
  docId
});
```

## Best Practices

1. **Async Processing**: Process documents asynchronously
2. **Error Handling**: Handle extraction failures gracefully
3. **Chunking**: Preserve context and meaning
4. **Metadata**: Store document metadata (title, page count, etc.)
5. **Status Tracking**: Track processing status (pending, indexed, failed)

## Error Handling

- **Extraction Failures**: Log error and mark document as failed
- **Chunking Failures**: Use fallback chunking strategy
- **Embedding Failures**: Retry with exponential backoff
- **Storage Failures**: Handle database errors gracefully

## Performance Considerations

- **Batch Processing**: Process multiple documents in parallel
- **Chunking Efficiency**: Optimize chunking for large documents
- **Embedding Batching**: Generate embeddings in batches
- **Storage Optimization**: Use efficient database operations

