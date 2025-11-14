import { mutation, query, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Create an embedding
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    contentId: v.optional(v.id("content")),
    roadmapId: v.optional(v.id("roadmaps")),
    text: v.string(),
    embedding: v.array(v.float64()),
    metadata: v.object({
      type: v.union(
        v.literal("roadmap"),
        v.literal("content"),
        v.literal("quiz"),
        v.literal("graph")
      ),
      subtopicId: v.optional(v.string()),
      subtopicName: v.optional(v.string()),
      title: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const embeddingId = await ctx.db.insert("embeddings", {
      workspaceId: args.workspaceId,
      contentId: args.contentId,
      roadmapId: args.roadmapId,
      text: args.text,
      embedding: args.embedding,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
    return embeddingId;
  },
});

// Batch create embeddings
export const createBatch = mutation({
  args: {
    embeddings: v.array(
      v.object({
        workspaceId: v.id("workspaces"),
        contentId: v.optional(v.id("content")),
        roadmapId: v.optional(v.id("roadmaps")),
        text: v.string(),
        embedding: v.array(v.float64()),
        metadata: v.object({
          type: v.union(
            v.literal("roadmap"),
            v.literal("content"),
            v.literal("quiz"),
            v.literal("graph")
          ),
          subtopicId: v.optional(v.string()),
          subtopicName: v.optional(v.string()),
          title: v.optional(v.string()),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const emb of args.embeddings) {
      const id = await ctx.db.insert("embeddings", {
        workspaceId: emb.workspaceId,
        contentId: emb.contentId,
        roadmapId: emb.roadmapId,
        text: emb.text,
        embedding: emb.embedding,
        metadata: emb.metadata,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

// Internal query to fetch embeddings by IDs (used by action)
export const fetchEmbeddingsByIds = internalQuery({
  args: {
    ids: v.array(v.id("embeddings")),
  },
  handler: async (ctx, args) => {
    const embeddings = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) {
        embeddings.push(doc);
      }
    }
    return embeddings;
  },
});

// Vector search for similar content
// Note: vectorSearch can only be used in actions, not queries
export const search = action({
  args: {
    workspaceId: v.id("workspaces"),
    queryEmbedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.vectorSearch("embeddings", "by_embedding", {
      vector: args.queryEmbedding,
      limit: args.limit || 5,
      filter: (q) => q.eq("workspaceId", args.workspaceId),
    });
    
    // Load the full documents using internal query
    const ids = results.map((r) => r._id);
    const embeddings = await ctx.runQuery(internal.embeddings.fetchEmbeddingsByIds, { ids });
    
    // Map scores back to documents
    const scoreMap = new Map(results.map((r) => [r._id, r._score]));
    return embeddings.map((emb) => ({
      ...emb,
      _score: scoreMap.get(emb._id) || 0.0,
    }));
  },
});

// Get embeddings by content ID
export const getByContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddings")
      .filter((q) => q.eq(q.field("contentId"), args.contentId))
      .collect();
  },
});

// Get embeddings by roadmap ID
export const getByRoadmap = query({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddings")
      .filter((q) => q.eq(q.field("roadmapId"), args.roadmapId))
      .collect();
  },
});

// Delete embeddings by content ID
export const deleteByContent = mutation({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    const embeddings = await ctx.db
      .query("embeddings")
      .filter((q) => q.eq(q.field("contentId"), args.contentId))
      .collect();
    
    for (const emb of embeddings) {
      await ctx.db.delete(emb._id);
    }
  },
});

