import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createGeneration = mutation({
  args: {
    userInput: v.string(),
  },
  handler: async (ctx, args) => {
    const generationId = await ctx.db.insert("deepResearchGenerations", {
      userInput: args.userInput,
      messages: [],
      clarificationCount: 0,
      waitingForResponse: false,
      status: "clarifying",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return generationId;
  },
});

export const updateGeneration = mutation({
  args: {
    generationId: v.id("deepResearchGenerations"),
    messages: v.optional(v.array(v.any())),
    clarificationCount: v.optional(v.number()),
    waitingForResponse: v.optional(v.boolean()),
    researchContext: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("clarifying"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, args) => {
    const { generationId, ...updates } = args;
    await ctx.db.patch(generationId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteGeneration = mutation({
  args: { generationId: v.id("deepResearchGenerations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.generationId);
  },
});

