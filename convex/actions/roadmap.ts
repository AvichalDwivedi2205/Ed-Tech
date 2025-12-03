"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { RoadmapGeneratorAgent } from "../../src/agents/roadmap_agent";
import { HumanMessage } from "@langchain/core/messages";
import { api } from "../_generated/api";

// Start roadmap generation - asks clarification question
export const startGeneration = action({
  args: {
    workspaceId: v.id("workspaces"),
    userInput: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Initialize agent
    const agent = new RoadmapGeneratorAgent();

    // Handle file upload if provided
    let ocrText = "";
    if (args.fileStorageId) {
      try {
        const file = await ctx.storage.get(args.fileStorageId);
        if (!file) {
          throw new Error("File not found in storage");
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.warn("OCR from Convex Storage not yet implemented. Skipping file processing.");
      } catch (error: any) {
        console.error("Failed to process file from storage:", error);
      }
    }

    // Create generation record
    const generationId = await ctx.runMutation(api.mutations.roadmapGenerations.createGeneration, {
      workspaceId: args.workspaceId,
      userInput: args.userInput,
    });

    // Run agent to ask clarification question
    const initialState = {
      user_input: args.userInput,
      ocr_text: ocrText,
      file_path: "",
      messages: [new HumanMessage(args.userInput)],
      clarification_count: 0, // Start at 0 to trigger clarification
      roadmap_context: ocrText || "",
      final_roadmap: {},
      waiting_for_response: false,
    };

    const result = await agent.graph.invoke(initialState);

    // Extract the clarification question
    const lastMessage = result.messages[result.messages.length - 1];
    const clarificationQuestion = lastMessage?.content || "";

    // Update generation with clarification question
    await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
      generationId,
      messages: result.messages.map((msg: any) => ({
        type: msg.constructor.name,
        content: msg.content,
      })),
      clarificationCount: result.clarification_count,
      waitingForResponse: result.waiting_for_response,
      roadmapContext: result.roadmap_context,
      status: result.waiting_for_response ? "clarifying" : "generating",
    });

    return {
      generationId,
      clarificationQuestion,
      waitingForResponse: result.waiting_for_response,
    };
  },
});

// Continue generation with user's answer - generates roadmap
export const continueGeneration = action({
  args: {
    generationId: v.id("roadmapGenerations"),
    userAnswer: v.string(),
  },
  handler: async (ctx, args) => {
    // Get generation state
    const generation = await ctx.runQuery(api.queries.roadmapGenerations.getGeneration, {
      generationId: args.generationId,
    });

    if (!generation) {
      throw new Error("Generation not found");
    }

    if (generation.status !== "clarifying") {
      throw new Error("Generation is not in clarifying state");
    }

    // Initialize agent
    const agent = new RoadmapGeneratorAgent();

    // Reconstruct messages from stored state
    const { HumanMessage, AIMessage } = await import("@langchain/core/messages");
    const messages = generation.messages.map((msg: any) => {
      if (msg.type === "HumanMessage") {
        return new HumanMessage(msg.content);
      } else if (msg.type === "AIMessage") {
        return new AIMessage(msg.content);
      }
      return new HumanMessage(msg.content);
    });

    // Add user's answer
    messages.push(new HumanMessage(args.userAnswer));

    // Update status to generating
    await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
      generationId: args.generationId,
      status: "generating",
    });

    // Continue from clarification state
    const initialState = {
      user_input: generation.userInput,
      ocr_text: generation.ocrText || "",
      file_path: "",
      messages,
      clarification_count: generation.clarificationCount + 1, // Increment to proceed
      roadmap_context: generation.roadmapContext || "",
      final_roadmap: {},
      waiting_for_response: false,
    };

    const result = await agent.graph.invoke(initialState);

    // Extract roadmap JSON
    const roadmapData = result.final_roadmap;

    if (!roadmapData || Object.keys(roadmapData).length === 0) {
      await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
        generationId: args.generationId,
        status: "failed",
      });
      throw new Error("Failed to generate roadmap");
    }

    // Extract title from user input - use first meaningful words
    // Try to create a concise title (max 60 chars)
    const userInputWords = generation.userInput.trim().split(/\s+/);
    let title = userInputWords.slice(0, 8).join(' ');
    
    // If TeachingStyle exists, add it as context
    if (roadmapData.TeachingStyle && title.length < 40) {
      title = `${title} (${roadmapData.TeachingStyle})`;
    }
    
    // Ensure title is not too long
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // Save roadmap
    const roadmapId = await ctx.runMutation(api.mutations.roadmaps.saveRoadmap, {
      workspaceId: generation.workspaceId,
      roadmapData,
      title: title.length > 100 ? title.substring(0, 100) : title,
      teachingStyle: roadmapData.TeachingStyle,
    });

    // Mark generation as completed
    await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
      generationId: args.generationId,
      status: "completed",
    });

    return {
      roadmapId,
      roadmapData,
      title,
    };
  },
});

// Legacy direct generation (for backwards compatibility)
export const generate = action({
  args: {
    workspaceId: v.id("workspaces"),
    userInput: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Use the new conversation flow
    const startResult = await ctx.runAction(api.actions.roadmap.startGeneration, {
      workspaceId: args.workspaceId,
      userInput: args.userInput,
      fileStorageId: args.fileStorageId,
    });

    // If it's waiting for response, we can't continue in a single call
    // So we'll skip clarification for legacy compatibility
    if (startResult.waitingForResponse) {
      // Auto-answer with the original input
      return await ctx.runAction(api.actions.roadmap.continueGeneration, {
        generationId: startResult.generationId,
        userAnswer: args.userInput, // Use original input as answer
      });
    }

    // If no clarification needed, return the result
    return {
      roadmapId: "",
      roadmapData: {},
    };
  },
});
