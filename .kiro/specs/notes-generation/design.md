# Design Document

## Overview

This design implements AI-powered note generation using NotesGeneratorAgent. The system creates concise, well-organized study notes from educational content.

## Architecture

### Agent Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Convex Action │    │   Agent         │
│   NotesViewer   │◄──►│   notes.ts      │◄──►│   notes_agent   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Notes Structure

```typescript
interface Notes {
  title: string;
  sections: NoteSection[];
  summary?: string;
}

interface NoteSection {
  heading: string;
  content: string;
  bulletPoints?: string[];
}
```

## Components and Interfaces

### NotesGeneratorAgent

```typescript
export class NotesGeneratorAgent {
  async generateNotes(
    content: string,
    subtopic: string
  ): Promise<Notes>
}
```

### Notes Schema

```typescript
notes: defineTable({
  workspaceId: v.id("workspaces"),
  subtopicId: v.string(),
  notesData: v.any(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

## Testing Strategy

### Unit Tests

- Agent note generation logic
- Note structure validation
- Content summarization

### Integration Tests

- End-to-end note generation
- Note editing flow

