import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveRoadmap = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        roadmapData: v.any(),
        title: v.optional(v.string()),
        teachingStyle: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("roadmaps", {
            workspaceId: args.workspaceId,
            roadmapData: args.roadmapData,
            title: args.title,
            teachingStyle: args.teachingStyle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
