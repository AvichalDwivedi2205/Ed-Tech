"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { RoadmapGeneratorAgent } from "../../src/agents/roadmap_agent";
import { api } from "../_generated/api";

export const generate = action({
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

    // Run agent
    // Skip clarification by setting clarification_count to 1
    // This allows direct roadmap generation from user input
    const initialState = {
      user_input: args.userInput,
      ocr_text: ocrText,
      file_path: "", // Not used when using storage
      messages: [],
      clarification_count: 1, // Set to 1 to skip clarification step
      roadmap_context: ocrText || "", // Use OCR text if available
      final_roadmap: {},
      waiting_for_response: false,
    };

    const result = await agent.graph.invoke(initialState);

    // Extract roadmap JSON
    const roadmapData = result.final_roadmap;

    if (!roadmapData || Object.keys(roadmapData).length === 0) {
      throw new Error("Failed to generate roadmap");
    }

    // Save results via mutation
    const roadmapId = await ctx.runMutation(api.mutations.roadmaps.saveRoadmap, {
      workspaceId: args.workspaceId,
      roadmapData,
    });

    // Return results
    return {
      roadmapId,
      roadmapData,
    };
  },
});

