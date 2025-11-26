import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const searchChunks = query({
  args: {
    queryEmbedding: v.array(v.number()),
    ragNamespace: v.string(),
    workspaceId: v.string(),
    k: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const k = args.k || 20;
    
    // Get indexed document IDs first
    const indexedDocs = await ctx.db
      .query("documents")
      .withIndex("by_workspace_namespace", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("ragNamespace", args.ragNamespace)
      )
      .filter((q) => q.eq(q.field("status"), "indexed"))
      .collect();
    
    const docIds = new Set(indexedDocs.map((d) => d._id));
    
    if (docIds.size === 0) {
      return [];
    }

    // Query chunks using the regular index (vector indexes are used for similarity search differently)
    const results = await ctx.db
      .query("chunks")
      .withIndex("by_workspace_namespace", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("ragNamespace", args.ragNamespace)
      )
      .collect();

    // Filter to only chunks from indexed documents and calculate similarity
    const scoredChunks = results
      .filter((chunk) => docIds.has(chunk.docId))
      .map((chunk) => {
        const similarity = cosineSimilarity(args.queryEmbedding, chunk.embedding);
        return { ...chunk, similarity };
      });

    // Sort by similarity and return top k
    return scoredChunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  },
});

export const getDocumentByPath = query({
  args: {
    sourcePath: v.string(),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_source_path", (q) =>
        q.eq("sourcePath", args.sourcePath).eq("workspaceId", args.workspaceId)
      )
      .first();
  },
});

export const insertDocument = mutation({
  args: {
    workspaceId: v.string(),
    ragNamespace: v.string(),
    title: v.string(),
    sourcePath: v.string(),
    pageCount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("indexed"),
      v.literal("skipped_page_limit"),
      v.literal("failed")
    ),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if document already exists
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_source_path", (q) =>
        q.eq("sourcePath", args.sourcePath).eq("workspaceId", args.workspaceId)
      )
      .first();

    if (existing) {
      // Update existing document
      await ctx.db.patch(existing._id, {
        title: args.title,
        pageCount: args.pageCount,
        status: args.status,
        hash: args.hash,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Insert new document
      return await ctx.db.insert("documents", {
        workspaceId: args.workspaceId,
        ragNamespace: args.ragNamespace,
        title: args.title,
        sourcePath: args.sourcePath,
        pageCount: args.pageCount,
        createdAt: now,
        updatedAt: now,
        status: args.status,
        hash: args.hash,
      });
    }
  },
});

export const insertChunks = mutation({
  args: {
    chunks: v.array(
      v.object({
        docId: v.id("documents"),
        workspaceId: v.string(),
        ragNamespace: v.string(),
        chunkIndex: v.number(),
        pageStart: v.number(),
        pageEnd: v.number(),
        text: v.string(),
        embedding: v.array(v.number()),
        metadata: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing chunks for these documents first
    const docIds = new Set(args.chunks.map((c) => c.docId));
    const existingChunks = await ctx.db
      .query("chunks")
      .collect();
    
    const chunksToDelete = existingChunks.filter((c) => docIds.has(c.docId));
    for (const chunk of chunksToDelete) {
      await ctx.db.delete(chunk._id);
    }

    // Insert new chunks
    const insertedIds: Id<"chunks">[] = [];
    for (const chunk of args.chunks) {
      const id = await ctx.db.insert("chunks", chunk);
      insertedIds.push(id);
    }
    return insertedIds;
  },
});

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

