"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { QuizGeneratorAgent } from "../../src/agents/quiz_agent";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const generate = action({
  args: {
    workspaceId: v.id("workspaces"),
    subtopicId: v.string(),
    contentId: v.optional(v.id("content")), // Optional: can provide content ID or content text directly
    contentText: v.optional(v.string()), // Optional: can provide content markdown directly
    topicName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    quizId: Id<"quizzes">;
    quiz: any;
  }> => {
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
    const agent = new QuizGeneratorAgent();

    // Run agent
    const initialState = {
      subtopic_id: args.subtopicId,
      topic_name: topicName || args.subtopicId,
      content_text: contentText,
      generated_questions: [],
      final_quiz: {},
      quiz_result: {},
      messages: [],
    };

    const result = await agent.graph.invoke(initialState);

    // Extract quiz result
    const quiz = result.quiz_result as any;
    
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      throw new Error("Failed to generate quiz");
    }

    // Save to database via mutation
    const quizId: Id<"quizzes"> = await ctx.runMutation(api.mutations.quizzes.saveQuiz, {
      workspaceId: args.workspaceId,
      subtopicId: args.subtopicId,
      quizData: quiz,
    });

    return {
      quizId,
      quiz,
    };
  },
});

