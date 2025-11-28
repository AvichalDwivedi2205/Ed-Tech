import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveRoadmap = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        roadmapData: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("roadmaps", {
            workspaceId: args.workspaceId,
            roadmapData: args.roadmapData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
