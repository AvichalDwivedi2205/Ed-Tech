import { v } from "convex/values";
import { query } from "../_generated/server";

export const getWorkspace = query({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const listWorkspaces = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.userId) {
            return await ctx.db
                .query("workspaces")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .collect();
        }
        // If no userId provided, return all (or handle as needed for public/shared)
        return await ctx.db.query("workspaces").collect();
    },
});

export const getWorkspaceContent = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const roadmaps = await ctx.db
            .query("roadmaps")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();

        const content = await ctx.db
            .query("content")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();

        const quizzes = await ctx.db
            .query("quizzes")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();

        const flashcards = await ctx.db
            .query("flashcards")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();

        const notes = await ctx.db
            .query("notes")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();

        return {
            roadmaps,
            content,
            quizzes,
            flashcards,
            notes,
        };
    },
});
