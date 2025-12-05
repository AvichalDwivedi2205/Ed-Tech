import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveNotes = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    notesData: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if notes already exist for this subtopic
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_workspace_subtopic", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("subtopicId", args.subtopicId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        notesData: args.notesData,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    const notesId = await ctx.db.insert("notes", {
      workspaceId: args.workspaceId,
      subtopicId: args.subtopicId,
      notesData: args.notesData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return notesId;
  },
});

export const deleteNotes = mutation({
  args: { notesId: v.id("notes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notesId);
  },
});
