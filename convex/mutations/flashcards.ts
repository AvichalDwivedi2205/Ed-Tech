import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveFlashcards = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        subtopicId: v.string(),
        flashcardData: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("flashcards", {
            workspaceId: args.workspaceId,
            subtopicId: args.subtopicId,
            flashcardData: args.flashcardData,
            createdAt: Date.now(),
        });
    },
});
