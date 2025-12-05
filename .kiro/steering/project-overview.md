---
inclusion: always
---

# OpenT Project Overview

OpenT is an AI-powered learning platform that helps users create personalized learning paths with roadmaps, content, flashcards, and quizzes.

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 16 (React 19), TypeScript, Tailwind CSS 4.x
- **Backend**: Convex (serverless backend-as-a-service)
- **AI Agents**: LangGraph-based agents for content generation
- **AI Models**: OpenRouter API (Gemini 2.5 Flash)
- **Search Tools**: Perplexity AI, Tavily Search API
- **Web Scraping**: Cheerio

### Core Features

#### 1. Workspaces
- User-created learning workspaces for different topics
- Each workspace contains roadmaps, content, flashcards, quizzes, and notes
- Document upload and RAG (Retrieval-Augmented Generation) support

#### 2. Roadmap Generation
- AI-powered roadmap creation with clarification questions
- Supports file uploads (OCR for images/PDFs)
- Personalized learning paths based on user preferences

#### 3. Content Generation
- Slide-based content generation
- Supports RAG (from uploaded documents) and web search
- Multiple content types: theory, examples, questions, exercises

#### 4. Deep Research Agent
- Comprehensive research reports with 20-30 sources (standard) or 70-80 sources (comprehensive)
- Multi-layered search approach:
  - Perplexity AI for broad contextual search
  - Tavily Search for targeted fact-finding (maximum depth)
  - Web scraping for authoritative sources
- Clarification questions before research
- Citation-backed markdown reports

#### 5. Flashcards & Quizzes
- AI-generated flashcards from content
- Quiz generation with multiple question types
- Practice materials for learning reinforcement

## Project Structure

```
openT/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   └── lib/          # Utilities and helpers
├── src/              # Backend/agent code
│   ├── agents/       # LangGraph agents
│   ├── tools/        # Search and utility tools
│   ├── services/     # RAG and other services
│   └── types/        # TypeScript type definitions
├── convex/           # Convex backend
│   ├── actions/      # Server actions
│   ├── mutations/    # Database mutations
│   ├── queries/      # Database queries
│   └── schema.ts     # Database schema
└── .kiro/            # Project documentation and specs
```

## Key Concepts

### Agents
All AI functionality is powered by LangGraph-based agents:
- **RoadmapGeneratorAgent**: Creates learning roadmaps
- **ContentCreatorAgent**: Generates educational content
- **QuizGeneratorAgent**: Creates quizzes
- **DeepResearchAgent**: Conducts comprehensive research

### Convex Integration
- All data stored in Convex database
- Real-time updates via Convex React hooks
- Server actions for long-running agent operations
- Mutations for data updates

### RAG (Retrieval-Augmented Generation)
- Document upload and chunking
- Vector embeddings stored in Convex
- Semantic search for context retrieval
- Used in content generation for workspace-specific knowledge

