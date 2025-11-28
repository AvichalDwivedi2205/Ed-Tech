import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveContent = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        subtopicId: v.string(),
        markdown: v.string(),
        jsonData: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("content", {
            workspaceId: args.workspaceId,
            subtopicId: args.subtopicId,
            markdown: args.markdown,
            jsonData: args.jsonData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
