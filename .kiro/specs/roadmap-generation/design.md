# Design Document

## Overview

This design implements an AI-powered roadmap generation system using LangGraph-based agents. The system creates personalized learning paths through clarification questions, supports file uploads with OCR, and generates interactive roadmap visualizations.

## Architecture

### Agent Architecture

The roadmap generation uses RoadmapGeneratorAgent built with LangGraph:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Convex Action  │    │   Agent         │
│   UI            │◄──►│   roadmap.ts     │◄──►│   roadmap_agent │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Convex DB      │    │   OCR Tool      │
                       │   roadmapGen     │    │   Search Tools  │
                       └──────────────────┘    └─────────────────┘
```

### State Management

The agent uses a state graph with the following states:
- **messages**: Conversation history
- **clarification_count**: Number of clarification rounds
- **waiting_for_response**: Whether waiting for user input
- **roadmapContext**: Context from uploaded files
- **ocrText**: Extracted text from uploaded files

## Components and Interfaces

### RoadmapGeneratorAgent

```typescript
export class RoadmapGeneratorAgent {
  private llm: any;
  private graph: StateGraph;
  
  async generateRoadmap(
    userInput: string,
    ocrText?: string,
    teachingStyle?: string
  ): Promise<RoadmapResult>
}
```

### Convex Actions

```typescript
// Start roadmap generation
startRoadmapGeneration: action({
  args: {
    workspaceId: v.id("workspaces"),
    userInput: v.string(),
    fileId: v.optional(v.id("_storage"))
  },
  handler: async (ctx, args) => {
    // Initialize agent and start generation
  }
})

// Continue clarification
continueClarification: action({
  args: {
    generationId: v.id("roadmapGenerations"),
    userResponse: v.string()
  },
  handler: async (ctx, args) => {
    // Process user response and continue
  }
})
```

### Roadmap Visualization

The roadmap is displayed using:
- **RoadmapFlow**: Main flow diagram component
- **RoadmapNode**: Individual topic node
- **SubtopicNode**: Subtopic display component

## Data Models

### roadmapGenerations Table

```typescript
roadmapGenerations: defineTable({
  workspaceId: v.id("workspaces"),
  userInput: v.string(),
  messages: v.array(v.any()),
  clarificationCount: v.number(),
  waitingForResponse: v.boolean(),
  roadmapContext: v.optional(v.string()),
  ocrText: v.optional(v.string()),
  status: v.union(
    v.literal("clarifying"),
    v.literal("generating"),
    v.literal("completed"),
    v.literal("failed")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### roadmaps Table

```typescript
roadmaps: defineTable({
  workspaceId: v.id("workspaces"),
  roadmapData: v.optional(v.any()),
  roadmapJson: v.optional(v.any()),
  title: v.optional(v.string()),
  teachingStyle: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

## Error Handling

### Generation Errors

1. **Agent Failure**: Retry with exponential backoff
2. **OCR Failure**: Continue without file content
3. **Clarification Timeout**: Use default settings
4. **Invalid Input**: Validate and request clarification

### User Experience

1. **Progress Indication**: Show generation progress
2. **Error Messages**: User-friendly error messages
3. **Recovery**: Allow regeneration on failure

## Testing Strategy

### Unit Tests

- Agent state transitions
- Clarification question generation
- OCR text extraction
- Roadmap JSON structure validation

### Integration Tests

- End-to-end roadmap generation
- File upload and OCR processing
- Clarification flow completion

### Feature Tests

- Roadmap visualization rendering
- Interactive node navigation
- Progress tracking

## Security Considerations

### Input Validation

1. **User Input**: Sanitize and validate user input
2. **File Uploads**: Validate file types and sizes
3. **OCR Content**: Limit processing time and size

### Data Privacy

1. **Workspace Isolation**: Ensure roadmap privacy
2. **File Storage**: Secure file storage and access
3. **Agent Context**: Limit context window size

## Performance Optimizations

### Agent Performance

1. **Streaming**: Stream generation progress
2. **Caching**: Cache common roadmap patterns
3. **Parallel Processing**: Process OCR and generation in parallel

### Frontend Optimizations

1. **Lazy Loading**: Load roadmap components on demand
2. **Virtualization**: Virtualize large roadmap diagrams
3. **Caching**: Cache rendered roadmap components

