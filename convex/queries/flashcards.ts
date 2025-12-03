import { v } from "convex/values";
import { query } from "../_generated/server";

export const getFlashcard = query({
  args: { flashcardId: v.id("flashcards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.flashcardId);
  },
});

export const getFlashcardBySubtopic = query({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_workspace_subtopic", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("subtopicId", args.subtopicId)
      )
      .first();
  },
});

export const listFlashcards = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

