# Design Document

## Overview

This design implements a comprehensive deep research agent using LangGraph. The agent conducts multi-layered research using Perplexity AI, Tavily Search, and web scraping to generate citation-backed markdown reports.

## Architecture

### Multi-Layered Search Strategy

1. **Perplexity AI**: Broad contextual search (5-10 results)
2. **Tavily Search**: Targeted fact-finding (20 results, maximum depth)
3. **Web Scraping**: Authoritative source extraction (25-60 URLs)

### Agent State

```typescript
DeepResearchAgentState = {
  messages: BaseMessage[],
  researchQuery: string,
  clarification_count: number,
  waiting_for_response: boolean,
  researchObjective: string,
  subQuestions: string[],
  researchPlan: any,
  searchResults: any[],
  scrapedContent: any[],
  verifiedSources: Citation[],
  synthesizedContent: string,
  finalReport: ResearchResult,
  settings: ResearchSettings,
  sourceCount: number
}
```

## Components and Interfaces

### DeepResearchAgent

```typescript
export class DeepResearchAgent {
  private perplexityTool: PerplexitySearchTool;
  private tavilyTool: TavilySearchTool;
  private webScraper: WebScraperTool;
  
  async conductResearch(
    query: string,
    mode: "normal" | "comprehensive"
  ): Promise<ResearchResult>
}
```

### Research Result

```typescript
interface ResearchResult {
  markdown: string;
  citations: Citation[];
  summary: string;
  sections: string[];
  researchDepth: ResearchMode;
  sourcesCount: number;
}
```

## Data Models

### deepResearchGenerations Table

```typescript
deepResearchGenerations: defineTable({
  userInput: v.string(),
  messages: v.array(v.any()),
  clarificationCount: v.number(),
  waitingForResponse: v.boolean(),
  researchContext: v.optional(v.string()),
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

### deepResearchReports Table

```typescript
deepResearchReports: defineTable({
  query: v.string(),
  title: v.string(),
  markdown: v.string(),
  summary: v.string(),
  citations: v.array(v.object({
    id: v.string(),
    url: v.string(),
    title: v.string(),
    snippet: v.optional(v.string()),
    accessedAt: v.string(),
  })),
  sections: v.array(v.string()),
  researchDepth: v.union(v.literal("normal"), v.literal("comprehensive")),
  sourcesCount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("completed"),
    v.literal("failed")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

## Testing Strategy

### Unit Tests

- Agent state transitions
- Search tool integration
- Citation extraction
- Report synthesis

### Integration Tests

- End-to-end research generation
- Multi-layered search coordination
- Source verification

## Performance Optimizations

### Search Optimization

1. **Parallel Searches**: Run searches in parallel
2. **Caching**: Cache search results
3. **Rate Limiting**: Respect API rate limits

### Scraping Optimization

1. **Parallel Scraping**: Use Promise.allSettled
2. **Content Limits**: Limit scraped content length
3. **URL Filtering**: Filter URLs before scraping

