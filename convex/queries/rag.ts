import { v } from "convex/values";
import { query } from "../_generated/server";

// List all documents for a workspace
export const listDocumentsByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

// Get chunks for a document
export const getChunksByDocument = query({
  args: { docId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chunks")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();
  },
});

