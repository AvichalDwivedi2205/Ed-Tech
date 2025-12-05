"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { ShortNotesGeneratorAgent } from "../../src/agents/notes_agent";
import { api } from "../_generated/api";

export const generate = action({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    contentId: v.optional(v.id("content")),
    contentText: v.optional(v.string()),
    topicName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ notesId: string; notesSet: any }> => {
    // Get content if contentId provided
    let contentText = args.contentText;
    let topicName = args.topicName;

    if (args.contentId && !contentText) {
      const content = await ctx.runQuery(api.queries.content.getContent, {
        contentId: args.contentId,
      });
      if (!content) {
        throw new Error("Content not found");
      }
      contentText = content.markdown || content.content || "";
      topicName = content.subtopicName || args.topicName || args.subtopicId;
    }

    if (!contentText || contentText.trim().length === 0) {
      throw new Error("Content text is required");
    }

    // Initialize agent
    const agent = new ShortNotesGeneratorAgent();

    // Run agent
    const initialState = {
      subtopic_id: args.subtopicId,
      topic_name: topicName || args.subtopicId,
      content_text: contentText,
      generated_notes: [],
      final_notes_set: {},
      notes_result: {},
      messages: [],
    };

    const result = await agent.graph.invoke(initialState);

    // Extract notes result
    const notesSet = result.notes_result as any;
    
    if (!notesSet || !notesSet.notes || notesSet.notes.length === 0) {
      throw new Error("Failed to generate short notes");
    }

    // Save to database via mutation
    const notesId: string = await ctx.runMutation(api.mutations.notes.saveNotes, {
      workspaceId: args.workspaceId,
      subtopicId: args.subtopicId,
      notesData: notesSet,
    });

    return {
      notesId,
      notesSet,
    };
  },
});
