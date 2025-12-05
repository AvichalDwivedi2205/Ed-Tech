# Design Document

## Overview

This design implements AI-powered quiz generation using QuizGeneratorAgent. The system creates interactive quizzes with multiple question types from educational content.

## Architecture

### Agent Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Convex Action  │    │   Agent         │
│   QuizViewer    │◄──►│   quiz.ts        │◄──►│   quiz_agent     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Quiz Structure

```typescript
interface Quiz {
  questions: Question[];
  totalQuestions: number;
  timeLimit?: number;
}

interface Question {
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}
```

## Components and Interfaces

### QuizGeneratorAgent

```typescript
export class QuizGeneratorAgent {
  async generateQuiz(
    content: string,
    subtopic: string,
    questionCount?: number
  ): Promise<Quiz>
}
```

### Quiz Schema

```typescript
quizzes: defineTable({
  workspaceId: v.id("workspaces"),
  subtopicId: v.string(),
  quizData: v.any(),
  createdAt: v.number(),
})
```

## Testing Strategy

### Unit Tests

- Agent quiz generation logic
- Question type generation
- Answer validation

### Integration Tests

- End-to-end quiz generation
- Quiz taking flow

