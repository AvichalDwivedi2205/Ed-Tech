"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { ContentCreatorAgent } from "../../src/agents/content_agent";
import { ContentGenerationSettings } from "../../src/types/content_schema";
import { api } from "../_generated/api";

export const generate = action({
  args: {
    workspaceId: v.id("workspaces"),
    roadmapId: v.optional(v.id("roadmaps")),
    roadmapJson: v.optional(v.any()), // Can provide roadmap JSON directly
    subtopicId: v.optional(v.string()), // For single subtopic generation
    settings: v.optional(v.object({
      useRag: v.optional(v.boolean()),
      useWebSearch: v.optional(v.boolean()),
      ragNamespace: v.optional(v.string()),
    })),
    completedSubtopics: v.optional(v.array(v.string())), // Already generated subtopics
  },
  handler: async (ctx, args) => {
    // Get roadmap data if roadmapId provided
    let roadmapJson = args.roadmapJson;
    if (args.roadmapId && !roadmapJson) {
      const roadmap = await ctx.runQuery(api.queries.roadmaps.getRoadmap, {
        roadmapId: args.roadmapId,
      });
      if (!roadmap) {
        throw new Error("Roadmap not found");
      }
      // Support both new and legacy field names
      roadmapJson = roadmap.roadmapData || roadmap.roadmapJson;
      if (!roadmapJson) {
        throw new Error("Roadmap data is empty");
      }
    }

    if (!roadmapJson) {
      throw new Error("Roadmap data is required");
    }

    // Build settings
    // Convert Id<"workspaces"> to string for ContentGenerationSettings
    const settings: ContentGenerationSettings = {
      useRag: args.settings?.useRag ?? false,
      useWebSearch: args.settings?.useWebSearch ?? true,
      ragNamespace: args.settings?.ragNamespace || "general",
      workspaceId: args.workspaceId as string,
    };

    // Initialize agent with settings
    const agent = new ContentCreatorAgent(settings);

    // Run agent
    const initialState = {
      roadmap_json: roadmapJson,
      completed_subtopics: args.completedSubtopics || [],
      pending_subtopics: [],
      current_subtopic_id: args.subtopicId || "",
      current_subtopic_data: {},
      content_plan: [],
      current_section_index: 0,
      sections_content: [],
      final_json: {},
      content_result: {},
      messages: [],
      ragContext: "",
      webContext: "",
      settings,
    };

    const result = await agent.graph.invoke(initialState);

    // Extract content result
    const contentResult = result.content_result as any;
    
    if (!contentResult || !contentResult.markdown) {
      throw new Error("Failed to generate content");
    }

    // Save to database via mutation
    const contentId = await ctx.runMutation(api.mutations.content.saveContent, {
      workspaceId: args.workspaceId,
      subtopicId: contentResult.id || args.subtopicId || "",
      markdown: contentResult.markdown,
      jsonData: contentResult,
    });

    return {
      contentId,
      content: contentResult,
    };
  },
});

