import { v } from "convex/values";
import { query } from "../_generated/server";

export const getQuiz = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.quizId);
  },
});

export const getQuizBySubtopic = query({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_workspace_subtopic", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("subtopicId", args.subtopicId)
      )
      .first();
  },
});

export const listQuizzes = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

