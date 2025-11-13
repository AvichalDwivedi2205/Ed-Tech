import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

// Vector search for similar content
export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    queryEmbedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("embeddings")
      .withIndex("by_embedding", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .vectorSearch("embedding", args.queryEmbedding, {
        limit: args.limit || 5,
      });
    
    return results;
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

