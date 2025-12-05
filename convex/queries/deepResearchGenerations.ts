import { v } from "convex/values";
import { query } from "../_generated/server";

export const getGeneration = query({
  args: {
    generationId: v.id("deepResearchGenerations"),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    return generation;
  },
});

