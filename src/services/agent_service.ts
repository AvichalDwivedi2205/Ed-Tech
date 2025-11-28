import { RoadmapGeneratorAgent } from "../agents/roadmap_agent";
import { ContentCreatorAgent } from "../agents/content_agent";
import { QuizGeneratorAgent } from "../agents/quiz_agent";
import { FlashcardGeneratorAgent } from "../agents/flashcard_agent";
import { ContentGenerationSettings } from "../types/content_schema";

export interface AgentServiceConfig {
  workspaceId: string;
  convexUrl?: string;
}

export interface RoadmapGenerationResult {
  roadmapId: string;
  roadmapData: any;
}

export interface ContentGenerationResult {
  contentId: string;
  content: {
    id: string;
    title: string;
    createdAt: string;
    markdown: string;
  };
}

export interface QuizGenerationResult {
  quizId: string;
  quiz: any;
}

export interface FlashcardGenerationResult {
  flashcardId: string;
  flashcardSet: any;
}

export class AgentService {
  private workspaceId: string;
  private convexUrl?: string;

  constructor(config: AgentServiceConfig) {
    this.workspaceId = config.workspaceId;
    this.convexUrl = config.convexUrl;
  }

  /**
   * Generate a roadmap
   */
  async generateRoadmap(
    userInput: string,
    fileStorageId?: string
  ): Promise<RoadmapGenerationResult> {
    const agent = new RoadmapGeneratorAgent();

    const initialState = {
      user_input: userInput,
      ocr_text: "",
      file_path: "",
      messages: [],
      clarification_count: 0,
      roadmap_context: "",
      final_roadmap: {},
      waiting_for_response: false,
    };

    const result = await agent.graph.invoke(initialState);
    const roadmapData = result.final_roadmap;

    if (!roadmapData || Object.keys(roadmapData).length === 0) {
      throw new Error("Failed to generate roadmap");
    }

    return {
      roadmapId: "", // Will be set by caller after saving to database
      roadmapData,
    };
  }

  /**
   * Generate content for a subtopic
   */
  async generateContent(
    roadmapJson: any,
    subtopicId?: string,
    settings?: Partial<ContentGenerationSettings>,
    completedSubtopics?: string[]
  ): Promise<ContentGenerationResult> {
    const fullSettings: ContentGenerationSettings = {
      useRag: settings?.useRag ?? false,
      useWebSearch: settings?.useWebSearch ?? true,
      ragNamespace: settings?.ragNamespace || "general",
      workspaceId: this.workspaceId,
    };

    const agent = new ContentCreatorAgent(fullSettings);

    const initialState = {
      roadmap_json: roadmapJson,
      completed_subtopics: completedSubtopics || [],
      pending_subtopics: [],
      current_subtopic_id: subtopicId || "",
      current_subtopic_data: {},
      content_plan: [],
      current_section_index: 0,
      sections_content: [],
      final_json: {},
      content_result: {},
      messages: [],
      ragContext: "",
      webContext: "",
      settings: fullSettings,
    };

    const result = await agent.graph.invoke(initialState);
    const contentResult = result.content_result as any;

    if (!contentResult || !contentResult.markdown) {
      throw new Error("Failed to generate content");
    }

    return {
      contentId: "", // Will be set by caller after saving to database
      content: contentResult,
    };
  }

  /**
   * Generate quiz from content
   */
  async generateQuiz(
    subtopicId: string,
    contentText: string,
    topicName?: string
  ): Promise<QuizGenerationResult> {
    const agent = new QuizGeneratorAgent();

    const initialState = {
      subtopic_id: subtopicId,
      topic_name: topicName || subtopicId,
      content_text: contentText,
      generated_questions: [],
      final_quiz: {},
      quiz_result: {},
      messages: [],
    };

    const result = await agent.graph.invoke(initialState);
    const quiz = result.quiz_result as any;

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      throw new Error("Failed to generate quiz");
    }

    return {
      quizId: "", // Will be set by caller after saving to database
      quiz,
    };
  }

  /**
   * Generate flashcards from content
   */
  async generateFlashcards(
    subtopicId: string,
    contentText: string,
    topicName?: string
  ): Promise<FlashcardGenerationResult> {
    const agent = new FlashcardGeneratorAgent();

    const initialState = {
      subtopic_id: subtopicId,
      topic_name: topicName || subtopicId,
      content_text: contentText,
      generated_flashcards: [],
      final_flashcard_set: {},
      flashcard_result: {},
      messages: [],
    };

    const result = await agent.graph.invoke(initialState);
    const flashcardSet = result.flashcard_result as any;

    if (!flashcardSet || !flashcardSet.cards || flashcardSet.cards.length === 0) {
      throw new Error("Failed to generate flashcards");
    }

    return {
      flashcardId: "", // Will be set by caller after saving to database
      flashcardSet,
    };
  }
}

