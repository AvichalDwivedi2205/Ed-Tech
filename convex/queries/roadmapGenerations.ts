import { v } from "convex/values";
import { query } from "../_generated/server";

export const getGeneration = query({
  args: { generationId: v.id("roadmapGenerations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

export const getActiveGeneration = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roadmapGenerations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "clarifying"),
          q.eq(q.field("status"), "generating")
        )
      )
      .order("desc")
      .first();
  },
});



