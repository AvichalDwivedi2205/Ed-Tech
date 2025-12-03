import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createGeneration = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userInput: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("roadmapGenerations", {
      workspaceId: args.workspaceId,
      userInput: args.userInput,
      messages: [],
      clarificationCount: 0,
      waitingForResponse: false,
      status: "clarifying",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateGeneration = mutation({
  args: {
    generationId: v.id("roadmapGenerations"),
    messages: v.optional(v.array(v.any())),
    clarificationCount: v.optional(v.number()),
    waitingForResponse: v.optional(v.boolean()),
    roadmapContext: v.optional(v.string()),
    ocrText: v.optional(v.string()),
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
  args: {
    generationId: v.id("roadmapGenerations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.generationId);
  },
});


