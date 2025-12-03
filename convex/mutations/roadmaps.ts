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
        // Extract title from roadmapData if not provided explicitly
        const title = args.title || 
            args.roadmapData?.title || 
            args.roadmapData?.RoadmapTitle || 
            "Untitled Roadmap";
        
        // Extract teaching style from roadmapData if not provided
        const teachingStyle = args.teachingStyle || args.roadmapData?.TeachingStyle;
        
        return await ctx.db.insert("roadmaps", {
            workspaceId: args.workspaceId,
            roadmapData: args.roadmapData,
            title,
            teachingStyle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

// Update an existing roadmap
export const updateRoadmap = mutation({
    args: {
        roadmapId: v.id("roadmaps"),
        roadmapData: v.optional(v.any()),
        title: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: Record<string, any> = {
            updatedAt: Date.now(),
        };
        
        if (args.roadmapData) {
            updates.roadmapData = args.roadmapData;
        }
        if (args.title) {
            updates.title = args.title;
        }
        
        await ctx.db.patch(args.roadmapId, updates);
    },
});

// Delete a roadmap
export const deleteRoadmap = mutation({
    args: {
        roadmapId: v.id("roadmaps"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.roadmapId);
    },
});
