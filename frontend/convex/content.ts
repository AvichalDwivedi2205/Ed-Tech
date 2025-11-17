import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create content for a subtopic
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    roadmapId: v.id("roadmaps"),
    subtopicId: v.string(),
    subtopicName: v.string(),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    quiz: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.union(v.string(), v.number()),
        explanation: v.optional(v.string()),
      })
    ),
    graphs: v.array(
      v.object({
        type: v.string(),
        title: v.string(),
        description: v.string(),
        code: v.string(),
        imageBase64: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const contentId = await ctx.db.insert("content", {
      workspaceId: args.workspaceId,
      roadmapId: args.roadmapId,
      subtopicId: args.subtopicId,
      subtopicName: args.subtopicName,
      content: args.content,
      contentHtml: args.contentHtml,
      quiz: args.quiz,
      graphs: args.graphs,
      status: args.status,
      errorMessage: args.errorMessage,
      createdAt: now,
      updatedAt: now,
    });
    return contentId;
  },
});

// Get content by ID
export const get = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contentId);
  },
});

// Get content by roadmap and subtopic
export const getByRoadmapSubtopic = query({
  args: {
    roadmapId: v.id("roadmaps"),
    subtopicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("content")
      .withIndex("by_roadmap_subtopic", (q) =>
        q.eq("roadmapId", args.roadmapId).eq("subtopicId", args.subtopicId)
      )
      .first();
  },
});

// List content for a roadmap
export const listByRoadmap = query({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("content")
      .withIndex("by_roadmap", (q) => q.eq("roadmapId", args.roadmapId))
      .collect();
  },
});

// List content for a workspace
export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("content")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

// Update content
export const update = mutation({
  args: {
    contentId: v.id("content"),
    content: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    quiz: v.optional(
      v.array(
        v.object({
          question: v.string(),
          options: v.array(v.string()),
          correctAnswer: v.union(v.string(), v.number()),
          explanation: v.optional(v.string()),
        })
      )
    ),
    graphs: v.optional(
      v.array(
        v.object({
          type: v.string(),
          title: v.string(),
          description: v.string(),
          code: v.string(),
          imageBase64: v.optional(v.string()),
          imageUrl: v.optional(v.string()),
        })
      )
    ),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("completed"),
        v.literal("error")
      )
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    type UpdatesType = {
      updatedAt: number;
      content?: string;
      contentHtml?: string;
      quiz?: Array<{
        question: string;
        options: string[];
        correctAnswer: string | number;
        explanation?: string;
      }>;
      graphs?: Array<{
        type: string;
        title: string;
        description: string;
        code: string;
        imageBase64?: string;
        imageUrl?: string;
      }>;
      status?: "pending" | "generating" | "completed" | "error";
      errorMessage?: string;
    };

    const updates: UpdatesType = { updatedAt: Date.now() };
    if (args.content !== undefined) updates.content = args.content;
    if (args.contentHtml !== undefined) updates.contentHtml = args.contentHtml;
    if (args.quiz !== undefined) updates.quiz = args.quiz;
    if (args.graphs !== undefined) updates.graphs = args.graphs;
    if (args.status !== undefined) updates.status = args.status;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.contentId, updates);
    return await ctx.db.get(args.contentId);
  },
});

// Delete content
export const remove = mutation({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.contentId);
  },
});

