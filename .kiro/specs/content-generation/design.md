# Design Document

## Overview

This design implements AI-powered content generation using ContentCreatorAgent. The system creates slide-based educational content with support for RAG from workspace documents and web search integration.

## Architecture

### Agent Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Convex Action  │    │   Agent         │
│   UI            │◄──►│   content.ts    │◄──►│   content_agent │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   RAG Service    │    │   Search Tools  │
                       │   Convex DB      │    │   Web Scraper   │
                       └──────────────────┘    └─────────────────┘
```

### Content Structure

Content is organized as slides with types:
- **theory**: Conceptual explanations
- **example**: Practical examples
- **question**: Review questions
- **exercise**: Practice exercises
- **summary**: Topic summaries

## Components and Interfaces

### ContentCreatorAgent

```typescript
export class ContentCreatorAgent {
  private llm: any;
  private ragService: RAGService;
  private searchTools: SearchTools;
  
  async generateContent(
    subtopic: string,
    workspaceId: string,
    roadmapContext?: string
  ): Promise<ContentResult>
}
```

### Content Schema

```typescript
slides: v.array(v.object({
  pageNumber: v.number(),
  type: v.string(),  // "theory" | "example" | "question" | "exercise" | "summary"
  title: v.string(),
  content: v.string(),
  notes: v.optional(v.string()),
}))
```

## Data Models

### content Table

```typescript
content: defineTable({
  workspaceId: v.id("workspaces"),
  subtopicId: v.string(),
  subtopicName: v.optional(v.string()),
  markdown: v.optional(v.string()),
  slides: v.optional(v.array(v.object({...}))),
  totalSlides: v.optional(v.number()),
  roadmapId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

## Error Handling

### Generation Errors

1. **Agent Failure**: Retry with error logging
2. **RAG Failure**: Continue without document context
3. **Search Failure**: Continue without web content
4. **Invalid Subtopic**: Validate subtopic before generation

## Testing Strategy

### Unit Tests

- Agent content generation logic
- RAG integration
- Search tool integration
- Slide structure validation

### Integration Tests

- End-to-end content generation
- RAG document retrieval
- Web search integration

## Performance Optimizations

### Generation Performance

1. **Parallel Processing**: Process RAG and search in parallel
2. **Caching**: Cache common content patterns
3. **Streaming**: Stream generation progress

### Frontend Optimizations

1. **Lazy Loading**: Load slides on demand
2. **Virtualization**: Virtualize slide rendering
3. **Caching**: Cache rendered content

