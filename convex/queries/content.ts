import { v } from "convex/values";
import { query } from "../_generated/server";

export const getContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contentId);
  },
});

export const getContentBySubtopic = query({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("content")
      .withIndex("by_workspace_subtopic", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("subtopicId", args.subtopicId)
      )
      .first();
  },
});

export const listContent = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("content")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

