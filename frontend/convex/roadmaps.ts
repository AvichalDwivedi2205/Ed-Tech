import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new roadmap
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.optional(v.string()),
    roadmapJson: v.any(),
    teachingStyle: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error")
    ),
    sessionId: v.optional(v.string()),
    uploadedFileId: v.optional(v.id("_storage")),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const roadmapId = await ctx.db.insert("roadmaps", {
      workspaceId: args.workspaceId,
      title: args.title,
      description: args.description,
      roadmapJson: args.roadmapJson,
      teachingStyle: args.teachingStyle,
      status: args.status,
      sessionId: args.sessionId,
      uploadedFileId: args.uploadedFileId,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    return roadmapId;
  },
});

// Get roadmap by ID
export const get = query({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roadmapId);
  },
});

// List roadmaps for a workspace
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roadmaps")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

// Update roadmap
export const update = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    roadmapJson: v.optional(v.any()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("generating"),
        v.literal("completed"),
        v.literal("error")
      )
    ),
  },
  handler: async (ctx, args) => {
    const updates: any = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.roadmapJson !== undefined) updates.roadmapJson = args.roadmapJson;
    if (args.status !== undefined) updates.status = args.status;
    
    await ctx.db.patch(args.roadmapId, updates);
    return await ctx.db.get(args.roadmapId);
  },
});

// Get roadmap by session ID
export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const roadmap = await ctx.db
      .query("roadmaps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return roadmap;
  },
});

// Delete roadmap
export const remove = mutation({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.roadmapId);
  },
});

