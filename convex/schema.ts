import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    workspaceId: v.string(),
    ragNamespace: v.string(),
    title: v.string(),
    sourcePath: v.string(),
    pageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("indexed"),
      v.literal("skipped_page_limit"),
      v.literal("failed")
    ),
    hash: v.string(),
  })
    .index("by_workspace_namespace", ["workspaceId", "ragNamespace"])
    .index("by_source_path", ["sourcePath", "workspaceId"])
    .index("by_hash", ["hash", "workspaceId"]),

  chunks: defineTable({
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
    .index("by_doc", ["docId"])
    .index("by_workspace_namespace", ["workspaceId", "ragNamespace"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["workspaceId", "ragNamespace"],
    }),
});

