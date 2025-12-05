"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { DeepResearchAgent, ResearchSettings } from "../../src/agents/deep_research_agent";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export const startResearch = action({
  args: {
    query: v.string(),
    mode: v.union(v.literal("normal"), v.literal("comprehensive")),
    maxSources: v.optional(v.number()),
    maxScrapedUrls: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    generationId: Id<"deepResearchGenerations">;
    clarificationQuestion: string;
  }> => {
    // Build settings
    const settings: ResearchSettings = {
      mode: args.mode,
      maxSources: args.maxSources,
      maxScrapedUrls: args.maxScrapedUrls,
    };

    // Initialize agent
    const agent = new DeepResearchAgent(settings);

    // Create generation record
    const generationId = await ctx.runMutation(api.mutations.deepResearchGenerations.createGeneration, {
      userInput: args.query,
    });

    // Run agent - always ask clarification questions by setting clarification_count to 0
    const initialState = {
      researchQuery: args.query,
      researchObjective: "",
      subQuestions: [],
      researchPlan: {},
      searchResults: [],
      scrapedContent: [],
      verifiedSources: [],
      synthesizedContent: "",
      finalReport: {},
      messages: [],
      clarification_count: 0, // Set to 0 to always ask clarification questions
      waiting_for_response: false,
      settings,
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
      : "Could you please provide more details about the scope, depth, and purpose of your research?";

    // Save state to database - serialize messages properly
    await ctx.runMutation(api.mutations.deepResearchGenerations.updateGeneration, {
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
      researchContext: args.query,
      status: "clarifying",
    });

    return {
      generationId,
      clarificationQuestion,
    };
  },
});

export const continueResearch = action({
  args: {
    generationId: v.id("deepResearchGenerations"),
    userAnswer: v.string(),
  },
  handler: async (ctx, args): Promise<{
    reportId: Id<"deepResearchReports">;
    report: any;
  }> => {
    // Load generation record
    const generation = await ctx.runQuery(api.queries.deepResearchGenerations.getGeneration, {
      generationId: args.generationId,
    });

    if (!generation) {
      throw new Error("Generation not found");
    }

    if (generation.status !== "clarifying") {
      throw new Error(`Generation is not in clarifying state. Current status: ${generation.status}`);
    }

    // Extract settings from user input (we'll need to parse mode from context or use default)
    // For now, default to normal mode - could be enhanced to store mode in generation
    const settings: ResearchSettings = {
      mode: "normal", // Default, could be extracted from generation context
    };

    // Initialize agent
    const agent = new DeepResearchAgent(settings);

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
      researchQuery: generation.userInput,
      researchObjective: "",
      subQuestions: [],
      researchPlan: {},
      searchResults: [],
      scrapedContent: [],
      verifiedSources: [],
      synthesizedContent: "",
      finalReport: {},
      messages,
      clarification_count: generation.clarificationCount,
      waiting_for_response: false, // User has answered, so we're not waiting anymore
      settings,
    };

    // Update status to generating
    await ctx.runMutation(api.mutations.deepResearchGenerations.updateGeneration, {
      generationId: args.generationId,
      status: "generating",
    });

    // Create report record with generating status
    const reportId = await ctx.runMutation(api.mutations.deepResearch.createReport, {
      query: generation.userInput,
      title: generation.userInput,
      status: "generating",
    });

    try {
      // Continue running the agent
      const result = await agent.graph.invoke(initialState);

      // Extract report result
      const reportResult = result.finalReport as any;

      if (!reportResult || !reportResult.markdown) {
        await ctx.runMutation(api.mutations.deepResearch.updateReport, {
          reportId,
          status: "failed",
        });
        await ctx.runMutation(api.mutations.deepResearchGenerations.updateGeneration, {
          generationId: args.generationId,
          status: "failed",
        });
        throw new Error("Failed to generate research report");
      }

      // Update report with results
      await ctx.runMutation(api.mutations.deepResearch.updateReport, {
        reportId,
        title: reportResult.markdown.split("\n")[0].replace("#", "").trim() || generation.userInput,
        markdown: reportResult.markdown,
        summary: reportResult.summary || "",
        citations: reportResult.citations || [],
        sections: reportResult.sections || [],
        researchDepth: reportResult.researchDepth || "normal",
        sourcesCount: reportResult.sourcesCount || 0,
        status: "completed",
      });

      // Update generation status to completed
      await ctx.runMutation(api.mutations.deepResearchGenerations.updateGeneration, {
        generationId: args.generationId,
        status: "completed",
      });

      return {
        reportId,
        report: reportResult,
      };
    } catch (error: any) {
      // Update report with failed status
      await ctx.runMutation(api.mutations.deepResearch.updateReport, {
        reportId,
        status: "failed",
      });
      await ctx.runMutation(api.mutations.deepResearchGenerations.updateGeneration, {
        generationId: args.generationId,
        status: "failed",
      });
      throw error;
    }
  },
});

