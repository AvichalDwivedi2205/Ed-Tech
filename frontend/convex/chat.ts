import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a chat message
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    message: v.string(),
    response: v.string(),
    contextChunks: v.array(
      v.object({
        text: v.string(),
        type: v.string(),
        subtopicName: v.optional(v.string()),
      })
    ),
    citations: v.array(
      v.object({
        contentId: v.optional(v.id("content")),
        text: v.string(),
        relevanceScore: v.float64(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      message: args.message,
      response: args.response,
      contextChunks: args.contextChunks,
      citations: args.citations,
      createdAt: Date.now(),
    });
    return messageId;
  },
});

// Get chat messages for a workspace and user
export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .order("desc")
      .take(args.limit || 50);
    
    return messages.reverse(); // Return in chronological order
  },
});

// Get all chat messages for a workspace
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(args.limit || 50);
  },
});

// Delete chat messages for a workspace
export const deleteByWorkspace = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();
    
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

