import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveContent = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        subtopicId: v.string(),
        subtopicName: v.optional(v.string()),
        markdown: v.string(),
        jsonData: v.any(),
        slides: v.optional(v.array(v.object({
            pageNumber: v.number(),
            type: v.string(),
            title: v.string(),
            content: v.string(),
            notes: v.optional(v.string()),
        }))),
        totalSlides: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Extract subtopicName from jsonData if not provided directly
        const subtopicName = args.subtopicName || args.jsonData?.title || args.subtopicId;
        
        return await ctx.db.insert("content", {
            workspaceId: args.workspaceId,
            subtopicId: args.subtopicId,
            subtopicName: subtopicName,
            markdown: args.markdown,
            jsonData: args.jsonData,
            slides: args.slides,
            totalSlides: args.totalSlides || args.slides?.length || 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
