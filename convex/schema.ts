import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    workspaceId: v.string(),
    ragNamespace: v.string(),
    title: v.string(),
    sourcePath: v.optional(v.string()), // Made optional to support transition or external links
    storageId: v.optional(v.id("_storage")), // Added storageId
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
    .index("by_hash", ["hash", "workspaceId"])
    .index("by_workspace", ["workspaceId"]), // Added by_workspace index

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

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.optional(v.string()), // Optional for future auth (legacy)
    ownerId: v.optional(v.string()), // Owner ID field
    members: v.optional(v.array(v.object({
      userId: v.string(),
      role: v.string(),
      addedAt: v.number(),
    }))), // Members array for multi-user workspaces
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  roadmaps: defineTable({
    workspaceId: v.id("workspaces"),
    roadmapData: v.optional(v.any()), // JSON data (new format)
    roadmapJson: v.optional(v.any()), // Legacy field name, kept for backward compatibility
    createdAt: v.number(),
    updatedAt: v.number(),
    // Legacy fields for backward compatibility
    createdBy: v.optional(v.string()),
    status: v.optional(v.string()),
    teachingStyle: v.optional(v.string()),
    title: v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]),

  content: defineTable({
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    markdown: v.optional(v.string()), // Made optional for backward compatibility
    content: v.optional(v.string()), // Legacy field name, kept for backward compatibility
    jsonData: v.optional(v.any()), // Made optional as it may not always be needed
    createdAt: v.number(),
    updatedAt: v.number(),
    // Legacy fields for backward compatibility
    graphs: v.optional(v.array(v.any())),
    quiz: v.optional(v.array(v.any())),
    roadmapId: v.optional(v.string()),
    status: v.optional(v.string()),
    subtopicName: v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_subtopic", ["workspaceId", "subtopicId"]),

  quizzes: defineTable({
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    quizData: v.any(), // JSON
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_subtopic", ["workspaceId", "subtopicId"]),

  flashcards: defineTable({
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    flashcardData: v.any(), // JSON
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_subtopic", ["workspaceId", "subtopicId"]),
});

