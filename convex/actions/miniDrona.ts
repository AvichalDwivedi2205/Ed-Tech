"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { getModel } from "../../src/utils/model";
import { GeminiEmbeddingService } from "../../src/tools/embedding";
import type { Id } from "../_generated/dataModel";

export const askQuestion = action({
  args: {
    workspaceId: v.id("workspaces"),
    question: v.string(),
    selectedText: v.optional(v.string()),  // Text user selected for context
    currentContentId: v.optional(v.id("content")),  // Current content being viewed
  },
  handler: async (ctx, args): Promise<{
    answer: string;
    sources: { title: string; snippet: string }[];
  }> => {
    // Gather context from the workspace
    const contextParts: string[] = [];
    const sources: { title: string; snippet: string }[] = [];

    // 1. Get current content if viewing one
    if (args.currentContentId) {
      try {
        const currentContent = await ctx.runQuery(api.queries.content.getContent, {
          contentId: args.currentContentId,
        });
        if (currentContent) {
          const markdown = currentContent.markdown || currentContent.content || "";
          contextParts.push(`=== CURRENT LEARNING CONTENT ===\nTopic: ${currentContent.subtopicName || currentContent.subtopicId}\n\n${markdown.substring(0, 3000)}`);
          sources.push({
            title: currentContent.subtopicName || currentContent.subtopicId,
            snippet: markdown.substring(0, 150) + "...",
          });
        }
      } catch (e) {
        console.error("Failed to fetch current content:", e);
      }
    }

    // 2. Get workspace context (roadmaps, other content)
    try {
      const workspaceData = await ctx.runQuery(api.queries.workspaces.getWorkspaceContent, {
        workspaceId: args.workspaceId,
      });

      // Add roadmap context
      if (workspaceData?.roadmaps?.length > 0) {
        const roadmap = workspaceData.roadmaps[0];
        const roadmapJson = roadmap.roadmapData || roadmap.roadmapJson;
        if (roadmapJson) {
          const roadmapSummary = Object.keys(roadmapJson)
            .filter(key => typeof roadmapJson[key] === 'object' && roadmapJson[key]?.TopicName)
            .map(key => `- ${roadmapJson[key].TopicName}`)
            .join('\n');
          contextParts.push(`=== LEARNING ROADMAP ===\nTopics covered:\n${roadmapSummary}`);
        }
      }

      // Add other content context (limit to avoid token overflow)
      if (workspaceData?.content?.length > 0) {
        const otherContent = workspaceData.content
          .filter((c: any) => c._id !== args.currentContentId)
          .slice(0, 3);  // Limit to 3 other content pieces
        
        for (const content of otherContent) {
          const markdown = content.markdown || content.content || "";
          contextParts.push(`=== RELATED CONTENT: ${content.subtopicName || content.subtopicId} ===\n${markdown.substring(0, 1000)}`);
        }
      }
    } catch (e) {
      console.error("Failed to fetch workspace content:", e);
    }

    // 3. Add selected text context if provided
    if (args.selectedText) {
      contextParts.unshift(`=== SELECTED TEXT (User is asking about this) ===\n${args.selectedText}`);
    }

    // 4. Search RAG for relevant chunks
    try {
      const embeddingService = new GeminiEmbeddingService();
      const queryEmbedding = await embeddingService.embedQuery(args.question);
      
      const ragResults = await ctx.runQuery(api.rag.searchChunks, {
        queryEmbedding,
        ragNamespace: "general",
        workspaceId: args.workspaceId,
        k: 5,
      });

      if (ragResults.length > 0) {
        const ragContext = ragResults
          .map((r: any, idx: number) => `[${idx + 1}] ${r.text.substring(0, 500)}...`)
          .join('\n\n');
        contextParts.push(`=== RELEVANT DOCUMENT EXCERPTS ===\n${ragContext}`);
        
        ragResults.slice(0, 2).forEach((r: any) => {
          sources.push({
            title: `Document (Pages ${r.pageStart}-${r.pageEnd})`,
            snippet: r.text.substring(0, 100) + "...",
          });
        });
      }
    } catch (e) {
      console.error("RAG search failed:", e);
    }

    // 5. Generate answer using LLM
    const llm = getModel(0.3);  // Lower temperature for factual answers
    const combinedContext = contextParts.join('\n\n---\n\n');

    const systemPrompt = `You are Mini-Drona, a helpful AI learning assistant. You help students understand concepts from their learning materials.

CONTEXT FROM WORKSPACE:
${combinedContext}

GUIDELINES:
1. Answer questions based on the provided context
2. If the answer isn't in the context, say so but try to provide general guidance
3. Use clear, educational language appropriate for students
4. When explaining concepts, use examples when helpful
5. For math, use LaTeX: $inline$ or $$block$$
6. Keep answers focused and concise (2-4 paragraphs typically)
7. If referencing specific content, mention the topic name

Respond in Markdown format.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: args.question },
    ]);

    const answer = typeof response.content === 'string' 
      ? response.content 
      : (response.content as any[]).map(c => c.text || '').join('');

    return {
      answer,
      sources: sources.slice(0, 3),  // Limit sources shown
    };
  },
});
