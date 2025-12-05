// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.optional(v.string()),   // legacy / optional
    ownerId: v.optional(v.string()),
    members: v.optional(v.array(v.object({
      userId: v.string(),
      role: v.string(),
      addedAt: v.number(),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  documents: defineTable({
    workspaceId: v.id("workspaces"),
    ragNamespace: v.string(),
    title: v.string(),
    sourcePath: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
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
    .index("by_workspace", ["workspaceId"]),

  chunks: defineTable({
    docId: v.id("documents"),
    workspaceId: v.id("workspaces"),
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

  roadmapGenerations: defineTable({
    workspaceId: v.id("workspaces"),
    userInput: v.string(),
    messages: v.array(v.any()),
    clarificationCount: v.number(),
    waitingForResponse: v.boolean(),
    roadmapContext: v.optional(v.string()),
    ocrText: v.optional(v.string()),
    status: v.union(
      v.literal("clarifying"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_status", ["status"]),

  roadmaps: defineTable({
    workspaceId: v.id("workspaces"),
    roadmapData: v.optional(v.any()),
    roadmapJson: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
    status: v.optional(v.string()),
    teachingStyle: v.optional(v.string()),
    title: v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"]),

  content: defineTable({
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    subtopicName: v.optional(v.string()),  // Actual topic name from roadmap
    markdown: v.optional(v.string()),
    content: v.optional(v.string()),
    jsonData: v.optional(v.any()),
    slides: v.optional(v.array(v.object({
      pageNumber: v.number(),
      type: v.string(),  // "theory" | "example" | "question" | "exercise" | "summary"
      title: v.string(),
      content: v.string(),
      notes: v.optional(v.string()),
    }))),
    totalSlides: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    graphs: v.optional(v.array(v.any())),
    quiz: v.optional(v.array(v.any())),
    roadmapId: v.optional(v.string()),
    status: v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_subtopic", ["workspaceId", "subtopicId"]),

  quizzes: defineTable({
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    quizData: v.any(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_subtopic", ["workspaceId", "subtopicId"]),

  flashcards: defineTable({
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    flashcardData: v.any(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_subtopic", ["workspaceId", "subtopicId"]),
});
