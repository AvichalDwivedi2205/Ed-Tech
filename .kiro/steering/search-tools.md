---
inclusion: always
---

# Search Tools Guidelines

This document outlines how search tools are used in OpenT for content generation and research.

## Available Search Tools

### PerplexitySearchTool
- **Purpose**: Broad contextual search with reasoning
- **Use Case**: Initial research, understanding topics
- **Max Results**: 5-10 per query
- **API**: Perplexity Search API

### TavilySearchTool
- **Purpose**: Targeted fact-finding with precision
- **Use Case**: Finding specific information, facts
- **Max Results**: 20 per query
- **Search Depth**: "advanced" (maximum)
- **API**: Tavily Search API

### WebScraperTool
- **Purpose**: Extract content from authoritative sources
- **Use Case**: Deep research, detailed information
- **Max URLs**: 25 (standard), 60 (comprehensive)
- **Library**: Cheerio

## Search Strategy

### Multi-Layered Approach

1. **Broad Search**: Start with Perplexity for context
2. **Targeted Search**: Use Tavily for specific facts
3. **Deep Dive**: Scrape authoritative sources

### Coordination

- Run searches in parallel when possible
- Deduplicate URLs across search results
- Respect API rate limits
- Filter URLs before scraping

## Usage Patterns

### In Content Generation

```typescript
// Use search to enhance content
const searchResults = await perplexityTool.search(query);
const context = extractContext(searchResults);
```

### In Deep Research

```typescript
// Multi-layered search
const perplexityResults = await perplexityTool.search(query);
const tavilyResults = await tavilyTool.search(query, 20, "advanced");
const urls = extractUrls([...perplexityResults, ...tavilyResults]);
const scrapedContent = await webScraper.scrapeMultiple(urls);
```

## Best Practices

1. **Parallel Execution**: Run independent searches in parallel
2. **Result Deduplication**: Remove duplicate URLs before scraping
3. **Rate Limiting**: Respect API rate limits
4. **Error Handling**: Continue with available results on failure
5. **Content Limits**: Limit scraped content to prevent token overflow

## Error Handling

- **API Failures**: Continue with available search results
- **Scraping Failures**: Use Promise.allSettled for parallel scraping
- **Rate Limits**: Implement exponential backoff
- **Invalid URLs**: Filter URLs before scraping

