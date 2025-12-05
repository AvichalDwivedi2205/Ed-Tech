import { v } from "convex/values";
import { query } from "../_generated/server";

export const getNotes = query({
  args: { notesId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.notesId);
  },
});

export const getNotesBySubtopic = query({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_workspace_subtopic", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("subtopicId", args.subtopicId)
      )
      .first();
  },
});

export const listNotes = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});
