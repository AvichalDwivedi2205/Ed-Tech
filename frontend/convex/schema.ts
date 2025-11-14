import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Workspaces
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(), // Clerk user ID
    members: v.array(v.object({
      userId: v.string(),
      role: v.union(v.literal("owner"), v.literal("member"), v.literal("viewer")),
      addedAt: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["ownerId"],
    }),

  // Roadmaps
  roadmaps: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.optional(v.string()),
    roadmapJson: v.any(), // Complete roadmap structure
    teachingStyle: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error")
    ),
    sessionId: v.optional(v.string()), // For tracking generation
    uploadedFileId: v.optional(v.id("_storage")), // Convex file storage ID
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_creator", ["createdBy"])
    .index("by_session", ["sessionId"]),

  // Content (generated for each subtopic)
  content: defineTable({
    workspaceId: v.id("workspaces"),
    roadmapId: v.id("roadmaps"),
    subtopicId: v.string(), // "Subtopic1", "Subtopic2", etc.
    subtopicName: v.string(),
    content: v.string(), // Markdown content
    contentHtml: v.optional(v.string()), // Pre-rendered HTML (lazy loaded)
    quiz: v.array(v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctAnswer: v.union(v.string(), v.number()),
      explanation: v.optional(v.string()),
    })),
    graphs: v.array(v.object({
      type: v.string(),
      title: v.string(),
      description: v.string(),
      code: v.string(), // Python code
      imageBase64: v.optional(v.string()), // Base64 encoded PNG
      imageUrl: v.optional(v.string()), // Convex storage URL
    })),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_roadmap", ["roadmapId"])
    .index("by_roadmap_subtopic", ["roadmapId", "subtopicId"])
    .index("by_status", ["status"]),

  // Vector embeddings for Mini-Drona
  embeddings: defineTable({
    workspaceId: v.id("workspaces"),
    contentId: v.optional(v.id("content")),
    roadmapId: v.optional(v.id("roadmaps")),
    text: v.string(), // Chunk of text
    embedding: v.array(v.float64()), // Vector (768 dims for Google text-embedding-004)
    metadata: v.object({
      type: v.union(
        v.literal("roadmap"),
        v.literal("content"),
        v.literal("quiz"),
        v.literal("graph")
      ),
      subtopicId: v.optional(v.string()),
      subtopicName: v.optional(v.string()),
      title: v.optional(v.string()),
    }),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768, // Google text-embedding-004 uses 768 dimensions
      filterFields: ["workspaceId"],
    }),

  // Chat messages (Mini-Drona)
  chatMessages: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user ID
    message: v.string(),
    response: v.string(),
    contextChunks: v.array(v.object({
      text: v.string(),
      type: v.string(),
      subtopicName: v.optional(v.string()),
    })),
    citations: v.array(v.object({
      contentId: v.optional(v.id("content")),
      text: v.string(),
      relevanceScore: v.float64(),
    })),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),
});

