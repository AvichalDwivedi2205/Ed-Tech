"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { RoadmapGeneratorAgent } from "../../src/agents/roadmap_agent";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export const startGeneration = action({
  args: {
    workspaceId: v.id("workspaces"),
    userInput: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<{
    generationId: Id<"roadmapGenerations">;
    clarificationQuestion: string;
  }> => {
    // Initialize agent
    const agent = new RoadmapGeneratorAgent();

    // Handle file upload if provided
    let ocrText = "";
    if (args.fileStorageId) {
      try {
        // Get file from Convex Storage
        const file = await ctx.storage.get(args.fileStorageId);
        if (!file) {
          throw new Error("File not found in storage");
        }

        // Convert file to buffer for OCR
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // For now, we'll need to save temporarily or use OCR tool directly
        // Since OCRTool expects a file path, we'll need to update it or use a different approach
        // For now, let's skip OCR if file is provided via storage
        // TODO: Update OCRTool to accept buffer/data directly
        console.warn("OCR from Convex Storage not yet implemented. Skipping file processing.");
      } catch (error: any) {
        console.error("Failed to process file from storage:", error);
        // Continue without OCR text
      }
    }

    // Create generation record
    const generationId = await ctx.runMutation(api.mutations.roadmapGenerations.createGeneration, {
      workspaceId: args.workspaceId,
      userInput: args.userInput,
    });

    // Run agent - always ask clarification questions by setting clarification_count to 0
    const initialState = {
      user_input: args.userInput,
      ocr_text: ocrText,
      file_path: "", // Not used when using storage
      messages: [],
      clarification_count: 0, // Set to 0 to always ask clarification questions
      roadmap_context: ocrText || "", // Use OCR text if available
      final_roadmap: {},
      waiting_for_response: false,
    };

    const result = await agent.graph.invoke(initialState);

    // Check if we're waiting for clarification response
    if (!result.waiting_for_response) {
      throw new Error("Expected clarification question but agent did not wait for response");
    }

    // Extract clarification question from messages (last AI message)
    const aiMessages = result.messages.filter((msg: any) => {
      const className = msg.constructor?.name || "";
      return className === "AIMessage" || msg._getType?.() === "ai";
    });
    const clarificationQuestion = aiMessages.length > 0 
      ? (aiMessages[aiMessages.length - 1] as any).content 
      : "Could you please provide more details about your learning goals, preferred learning style, and current skill level?";

    // Save state to database - serialize messages properly
    await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
      generationId,
      messages: result.messages.map((msg: any) => {
        const className = msg.constructor?.name || "";
        let msgType = "SystemMessage";
        if (className === "AIMessage" || msg._getType?.() === "ai") {
          msgType = "AIMessage";
        } else if (className === "HumanMessage" || msg._getType?.() === "human") {
          msgType = "HumanMessage";
        }
        return {
          type: msgType,
          content: msg.content || "",
        };
      }),
      clarificationCount: result.clarification_count,
      waitingForResponse: result.waiting_for_response,
      roadmapContext: result.roadmap_context,
      ocrText: result.ocr_text,
      status: "clarifying",
    });

    return {
      generationId,
      clarificationQuestion,
    };
  },
});

export const continueGeneration = action({
  args: {
    generationId: v.id("roadmapGenerations"),
    userAnswer: v.string(),
  },
  handler: async (ctx, args): Promise<{
    roadmapId: Id<"roadmaps">;
    roadmapData: any;
  }> => {
    // Load generation record
    const generation = await ctx.runQuery(api.queries.roadmapGenerations.getGeneration, {
      generationId: args.generationId,
    });

    if (!generation) {
      throw new Error("Generation not found");
    }

    if (generation.status !== "clarifying") {
      throw new Error(`Generation is not in clarifying state. Current status: ${generation.status}`);
    }

    // Initialize agent
    const agent = new RoadmapGeneratorAgent();

    // Reconstruct messages from saved state
    const messages = generation.messages.map((msg: any) => {
      if (msg.type === "AIMessage") {
        return new AIMessage(msg.content);
      } else if (msg.type === "HumanMessage") {
        return new HumanMessage(msg.content);
      } else {
        return new SystemMessage(msg.content);
      }
    });

    // Add user's answer
    messages.push(new HumanMessage(args.userAnswer));

    // Continue from where we left off
    const initialState = {
      user_input: generation.userInput,
      ocr_text: generation.ocrText || "",
      file_path: "",
      messages,
      clarification_count: generation.clarificationCount,
      roadmap_context: generation.roadmapContext || "",
      final_roadmap: {},
      waiting_for_response: false, // User has answered, so we're not waiting anymore
    };

    // Update status to generating
    await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
      generationId: args.generationId,
      status: "generating",
    });

    // Continue running the agent
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

    // Save results via mutation
    const roadmapId: Id<"roadmaps"> = await ctx.runMutation(api.mutations.roadmaps.saveRoadmap, {
      workspaceId: generation.workspaceId,
      roadmapData,
    });

    // Update generation status to completed
    await ctx.runMutation(api.mutations.roadmapGenerations.updateGeneration, {
      generationId: args.generationId,
      status: "completed",
    });

    // Clean up generation record (optional - you might want to keep it for history)
    // await ctx.runMutation(api.mutations.roadmapGenerations.deleteGeneration, {
    //   generationId: args.generationId,
    // });

    return {
      roadmapId,
      roadmapData,
    };
  },
});
