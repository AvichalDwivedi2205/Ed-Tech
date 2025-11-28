import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createWorkspace = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const workspaceId = await ctx.db.insert("workspaces", {
            name: args.name,
            description: args.description,
            userId: args.userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return workspaceId;
    },
});

export const updateWorkspace = mutation({
    args: {
        id: v.id("workspaces"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },
});

export const deleteWorkspace = mutation({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        // Delete related data (cascade)
        // 1. Delete documents
        const documents = await ctx.db
            .query("documents")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
            .collect();
        for (const doc of documents) {
            await ctx.db.delete(doc._id);
            // Note: We should also delete chunks and storage files, but for now we just delete the doc record
            // Ideally we'd have a separate cleanup process or recursive deletion
        }

        // 2. Delete roadmaps
        const roadmaps = await ctx.db
            .query("roadmaps")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
            .collect();
        for (const roadmap of roadmaps) {
            await ctx.db.delete(roadmap._id);
        }

        // 3. Delete content
        const content = await ctx.db
            .query("content")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
            .collect();
        for (const item of content) {
            await ctx.db.delete(item._id);
        }

        // 4. Delete quizzes
        const quizzes = await ctx.db
            .query("quizzes")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
            .collect();
        for (const quiz of quizzes) {
            await ctx.db.delete(quiz._id);
        }

        // 5. Delete flashcards
        const flashcards = await ctx.db
            .query("flashcards")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
            .collect();
        for (const flashcard of flashcards) {
            await ctx.db.delete(flashcard._id);
        }

        // Finally delete the workspace
        await ctx.db.delete(args.id);
    },
});
