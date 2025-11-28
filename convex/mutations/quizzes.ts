import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveQuiz = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        subtopicId: v.string(),
        quizData: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("quizzes", {
            workspaceId: args.workspaceId,
            subtopicId: args.subtopicId,
            quizData: args.quizData,
            createdAt: Date.now(),
        });
    },
});
