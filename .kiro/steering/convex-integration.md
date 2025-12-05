---
inclusion: always
---

# Convex Integration Guidelines

This document outlines how Convex is used in OpenT and best practices for integration.

## Convex Overview

Convex is a serverless backend-as-a-service that provides:
- Real-time database with automatic reactivity
- Server actions for long-running operations
- File storage
- Vector search capabilities

## Database Schema

### Core Tables

#### workspaces
- User-created learning workspaces
- Contains name, description, timestamps
- Indexed by userId

#### roadmaps
- Generated learning roadmaps
- Linked to workspaces
- Contains roadmap JSON data

#### content
- Generated educational content
- Slide-based structure
- Linked to workspaces and subtopics

#### deepResearchReports
- Research reports from Deep Research Agent
- Contains markdown, citations, metadata
- Status tracking: pending → generating → completed/failed

#### deepResearchGenerations
- Clarification state for research generation
- Stores messages and waiting status
- Links to final report when completed

## Query Patterns

### List Queries
```typescript
export const listReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deepResearchReports")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit || 50);
  },
});
```

### Get Queries
```typescript
export const getReport = query({
  args: { reportId: v.id("deepResearchReports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reportId);
  },
});
```

## Mutation Patterns

### Create
```typescript
export const createReport = mutation({
  args: { query: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deepResearchReports", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### Update
```typescript
export const updateReport = mutation({
  args: {
    reportId: v.id("deepResearchReports"),
    markdown: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { reportId, ...updates } = args;
    await ctx.db.patch(reportId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
```

## Action Patterns

### Long-Running Operations
```typescript
export const startResearch = action({
  args: { query: v.string(), mode: v.union(...) },
  handler: async (ctx, args) => {
    // Create generation record
    const generationId = await ctx.runMutation(...);
    
    // Initialize agent
    const agent = new DeepResearchAgent();
    
    // Run agent
    const result = await agent.graph.invoke(initialState);
    
    // Update database
    await ctx.runMutation(...);
    
    return { generationId, ... };
  },
});
```

### Calling Mutations from Actions
```typescript
await ctx.runMutation(api.mutations.deepResearch.createReport, {
  query: args.query,
  title: args.title,
  status: "generating",
});
```

### Calling Queries from Actions
```typescript
const generation = await ctx.runQuery(
  api.queries.deepResearchGenerations.getGeneration,
  { generationId: args.generationId }
);
```

## Frontend Integration

### React Hooks
```tsx
// Query (reactive)
const reports = useQuery(api.queries.deepResearch.listReports, {});

// Mutation (optimistic updates)
const createReport = useMutation(api.mutations.deepResearch.createReport);

// Action (async operations)
const generateReport = useAction(api.actions.deepResearch.startResearch);
```

### Loading States
```tsx
if (data === undefined) {
  return <Loading />; // Query is loading
}

if (data === null) {
  return <NotFound />; // Query returned null
}
```

## Best Practices

### 1. Schema Design
- Use indexes for common query patterns
- Store denormalized data when needed for performance
- Use optional fields for flexibility
- Add timestamps (createdAt, updatedAt) to all tables

### 2. Query Optimization
- Use indexes for filtering
- Limit results with `.take()`
- Order results efficiently
- Avoid N+1 queries

### 3. Action Design
- Keep actions focused on single operations
- Use mutations for simple database operations
- Use actions for complex logic or external API calls
- Handle errors gracefully

### 4. State Management
- Use Convex queries for server state
- Use React state for UI-only state
- Leverage Convex reactivity for real-time updates
- Minimize prop drilling with Convex queries

### 5. Error Handling
- Return null from queries when not found
- Throw errors from actions for client handling
- Log errors server-side
- Provide user-friendly error messages

## Vector Search (RAG)

### Chunks Table
- Stores document chunks with embeddings
- Vector index for semantic search
- Filtered by workspaceId and namespace

### RAG Service
- Located in `src/services/rag_service.ts`
- Handles document chunking and embedding
- Performs semantic search
- Returns relevant context for agents

## File Storage

### Upload Pattern
```typescript
// Get upload URL
const uploadUrl = await getUploadUrl();

// Upload file
await fetch(uploadUrl, {
  method: "PUT",
  body: file,
});

// Store reference in database
await ctx.db.insert("documents", {
  storageId: storageId,
  // ...
});
```

