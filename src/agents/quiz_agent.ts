import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { TavilySearchTool } from "../tools/search";
import fs from "fs-extra";
import path from "path";
import { Quiz, Question } from "../types/quiz_schema";
import { repairJsonWithLatex } from "../utils/json_repair";
import { renderQuizToHtml } from "../utils/quiz_renderer";

// Define the state
export const QuizAgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    subtopic_id: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    topic_name: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    content_text: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    generated_questions: Annotation<Question[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    final_quiz: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
});

export class QuizGeneratorAgent {
    private llm: any;
    private llmStructured: any;
    private searchTool: TavilySearchTool;
    public graph: any;

    constructor() {
        this.llm = getModel(0.7);
        this.llmStructured = getModel(0.2);
        this.searchTool = new TavilySearchTool();
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(QuizAgentState)
            .addNode("load_content", this.loadContent.bind(this))
            .addNode("generate_from_content", this.generateFromContent.bind(this))
            .addNode("web_search_enrichment", this.webSearchEnrichment.bind(this))
            .addNode("compile_quiz", this.compileQuiz.bind(this))
            .addNode("save_quiz", this.saveQuiz.bind(this))

            .addEdge("__start__", "load_content")
            .addEdge("load_content", "generate_from_content")
            .addEdge("generate_from_content", "web_search_enrichment")
            .addEdge("web_search_enrichment", "compile_quiz")
            .addEdge("compile_quiz", "save_quiz")
            .addEdge("save_quiz", END);

        return workflow.compile();
    }

    private async loadContent(state: typeof QuizAgentState.State) {
        const subtopicId = state.subtopic_id;
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const contentPath = path.join(process.cwd(), "generated_content", safeFolderName, "content.json");

        if (!fs.existsSync(contentPath)) {
            throw new Error(`Content not found for subtopic: ${subtopicId}`);
        }

        const contentJson = await fs.readJson(contentPath);

        // Extract text content for the LLM
        let fullText = "";
        if (contentJson.blocks) {
            contentJson.blocks.forEach((block: any) => {
                if (block.type === 'paragraph' || block.type === 'heading') {
                    if (Array.isArray(block.content)) {
                        fullText += block.content.map((s: any) => s.text).join("") + "\n\n";
                    }
                } else if (block.type === 'list') {
                    block.items.forEach((item: any) => {
                        if (Array.isArray(item.content)) {
                            fullText += "- " + item.content.map((s: any) => s.text).join("") + "\n";
                        }
                    });
                }
            });
        }

        // Truncate if too long (approx 15k chars to fit context window comfortably with output)
        if (fullText.length > 20000) {
            fullText = fullText.substring(0, 20000) + "... (truncated)";
        }

        return {
            content_text: fullText,
            topic_name: contentJson.title || subtopicId
        };
    }

    private async generateFromContent(state: typeof QuizAgentState.State) {
        console.log(`Generating questions from content for: ${state.topic_name}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert exam creator. Create a challenging quiz based on the provided text.
            
            Generate 12 questions:
            - 4 Easy (Recall/Definition)
            - 4 Medium (Application/Analysis)
            - 4 Hard (Synthesis/Evaluation)
            
            Mix of types:
            - MCQ (Multiple Choice)
            - ShortAnswer
            - LongAnswer
            
            Output a JSON array of Question objects.
            
            Schema:
            interface Question {
                id: string; // e.g., "q1"
                type: "MCQ" | "ShortAnswer" | "LongAnswer";
                difficulty: "Easy" | "Medium" | "Hard";
                question: string;
                options?: string[]; // Array of 4 options for MCQ. Omit for others.
                correctAnswer: string; // The correct option text for MCQ, or model answer for others.
                explanation: string; // Detailed explanation.
                source: "Generated from Content";
            }
            
            Output ONLY valid JSON.
            `),
            new SystemMessage(`CONTENT:\n\n${state.content_text}`),
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({});

        let questions: Question[] = [];
        try {
            questions = repairJsonWithLatex((response as any).content);
        } catch (e) {
            console.error("Failed to parse generated questions", e);
        }

        return { generated_questions: questions };
    }

    private async webSearchEnrichment(state: typeof QuizAgentState.State) {
        console.log(`Searching for external questions for: ${state.topic_name}`);

        const query = `exam questions practice problems ${state.topic_name} university level with answers`;
        const searchResult = await this.searchTool.run(query);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert exam creator. I have searched for external practice problems.
            Extract or create 5-8 UNIQUE, high-quality questions based on the search results.
            Focus on "Hard" or "Medium" difficulty questions that might not be in the basic content.
            
            Output a JSON array of Question objects (same schema as before).
            Set "source" to "Web Search".
            `),
            new SystemMessage(`SEARCH RESULTS:\n\n${searchResult}`),
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({});

        let newQuestions: Question[] = [];
        try {
            newQuestions = repairJsonWithLatex((response as any).content);
        } catch (e) {
            console.error("Failed to parse web search questions", e);
        }

        // Assign unique IDs to new questions
        newQuestions = newQuestions.map((q, i) => ({
            ...q,
            id: `web-${Date.now()}-${i}`
        }));

        return { generated_questions: newQuestions };
    }

    private async compileQuiz(state: typeof QuizAgentState.State) {
        const allQuestions = state.generated_questions;

        // Ensure we have at least 10 questions
        if (allQuestions.length < 10) {
            console.warn(`Warning: Only generated ${allQuestions.length} questions.`);
        }

        const quiz: Quiz = {
            id: `quiz-${Date.now()}`,
            topicName: state.topic_name,
            createdAt: new Date().toISOString(),
            questions: allQuestions
        };

        return { final_quiz: quiz };
    }

    private async saveQuiz(state: typeof QuizAgentState.State) {
        const quiz = state.final_quiz as Quiz;
        const subtopicId = state.subtopic_id;
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputDir = path.join(process.cwd(), "generated_content", safeFolderName);

        await fs.ensureDir(outputDir);

        // Save JSON
        await fs.writeFile(path.join(outputDir, "quiz.json"), JSON.stringify(quiz, null, 2));

        // Render and Save HTML
        const html = renderQuizToHtml(quiz);
        await fs.writeFile(path.join(outputDir, "quiz.html"), html);

        console.log(`Quiz saved to ${outputDir}/quiz.json`);
        console.log(`Quiz HTML saved to ${outputDir}/quiz.html`);

        return {};
    }
}
