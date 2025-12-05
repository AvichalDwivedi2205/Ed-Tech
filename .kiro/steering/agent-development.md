---
inclusion: always
---

# Agent Development Guidelines

This document outlines how to develop and maintain LangGraph-based AI agents in OpenT.

## Agent Architecture

All agents use LangGraph's StateGraph pattern with:
- **State**: Defined using `Annotation.Root()` with typed fields
- **Nodes**: Individual processing steps
- **Edges**: Control flow between nodes
- **Conditional Edges**: Decision points in the workflow

## Agent Structure

### State Definition
```typescript
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // ... other state fields
});
```

### Graph Building
```typescript
private _buildGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("node_name", this.nodeMethod.bind(this))
    .addEdge("__start__", "first_node")
    .addConditionalEdges("decision_node", this.shouldContinue.bind(this), {
      yes: "next_node",
      no: END,
    })
    .addEdge("final_node", END);
  
  return workflow.compile();
}
```

## Available Agents

### 1. RoadmapGeneratorAgent
- **Purpose**: Generate personalized learning roadmaps
- **Features**: Clarification questions, OCR support, search integration
- **Location**: `src/agents/roadmap_agent.ts`

### 2. ContentCreatorAgent
- **Purpose**: Generate educational content from roadmaps
- **Features**: Slide-based content, RAG support, web search
- **Location**: `src/agents/content_agent.ts`

### 3. QuizGeneratorAgent
- **Purpose**: Generate quizzes from content
- **Features**: Multiple question types, difficulty levels
- **Location**: `src/agents/quiz_agent.ts`

### 4. DeepResearchAgent
- **Purpose**: Conduct comprehensive research reports
- **Features**: Multi-layered search, web scraping, citation management
- **Location**: `src/agents/deep_research_agent.ts`
- **Source Targets**: 20-30 (standard), 70-80 (comprehensive)

## Search Tools

### PerplexitySearchTool
- **Use**: Broad contextual search, reasoning-based queries
- **API**: Perplexity Search API
- **Max Results**: 5-10 per query

### TavilySearchTool
- **Use**: Targeted fact-finding, precise searches
- **API**: Tavily Search API
- **Max Results**: 20 per query (maximum)
- **Search Depth**: "advanced" (maximum)

### WebScraperTool
- **Use**: Extract content from authoritative sources
- **Library**: Cheerio
- **Max URLs**: 25 (standard), 60 (comprehensive)

## Agent Development Best Practices

### 1. State Management
- Use reducers for accumulating data (arrays, messages)
- Use simple assignment for single values
- Keep state flat and typed

### 2. Error Handling
- Wrap external API calls in try-catch
- Log errors with context
- Return empty/default values on failure (don't crash)

### 3. Clarification Flow
- Always ask clarification questions before major operations
- Store messages in state for context
- Use `waiting_for_response` flag to pause execution

### 4. Search Strategy
- Start broad (Perplexity) for context
- Follow with targeted searches (Tavily)
- Scrape authoritative sources for depth
- Iterate until source count targets are met

### 5. Citation Management
- Extract URLs from all search results
- Deduplicate using Set/Map
- Store citations with metadata (title, snippet, accessed date)
- Number citations sequentially

## Convex Integration

### Actions
- Use `"use node"` directive
- Import agent classes
- Initialize agents with settings
- Run agent graphs with initial state
- Save results via mutations

### State Persistence
- Use `deepResearchGenerations` table for clarification state
- Store serialized messages
- Track status: clarifying → generating → completed/failed

## Testing Agents

### Manual Testing
1. Create test queries
2. Run agents with test state
3. Inspect intermediate results
4. Verify final output

### Debugging
- Use `console.log` for state inspection
- Check Convex logs for action execution
- Verify API responses from search tools
- Test individual nodes in isolation

## Performance Considerations

### Search Optimization
- Run searches in parallel when possible
- Limit search queries based on mode
- Cache results when appropriate
- Use appropriate maxResults for each tool

### Scraping Limits
- Respect rate limits
- Use Promise.allSettled for parallel scraping
- Limit content length to prevent token overflow
- Filter URLs before scraping

### Token Management
- Be mindful of context window limits
- Summarize search results before synthesis
- Limit scraped content in final synthesis
- Use structured outputs when possible

