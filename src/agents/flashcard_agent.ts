import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import fs from "fs-extra";
import path from "path";
import { Flashcard, FlashcardSet } from "../types/flashcard_schema";
import { repairJsonWithLatex } from "../utils/json_repair";
import { renderFlashcardsToHtml } from "../utils/flashcard_renderer";

// Define the state
export const FlashcardAgentState = Annotation.Root({
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
    generated_flashcards: Annotation<Flashcard[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    final_flashcard_set: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
});

export class FlashcardGeneratorAgent {
    private llmStructured: any;
    public graph: any;

    constructor() {
        this.llmStructured = getModel(0.2);
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(FlashcardAgentState)
            .addNode("load_content", this.loadContent.bind(this))
            .addNode("generate_flashcards", this.generateFlashcards.bind(this))
            .addNode("compile_set", this.compileSet.bind(this))
            .addNode("save_flashcards", this.saveFlashcards.bind(this))

            .addEdge("__start__", "load_content")
            .addEdge("load_content", "generate_flashcards")
            .addEdge("generate_flashcards", "compile_set")
            .addEdge("compile_set", "save_flashcards")
            .addEdge("save_flashcards", END);

        return workflow.compile();
    }

    private async loadContent(state: typeof FlashcardAgentState.State) {
        const subtopicId = state.subtopic_id;
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const contentPath = path.join(process.cwd(), "generated_content", safeFolderName, "content.json");

        if (!fs.existsSync(contentPath)) {
            throw new Error(`Content not found for subtopic: ${subtopicId}`);
        }

        const contentJson = await fs.readJson(contentPath);

        // Extract text content for the LLM
        let fullText = contentJson.markdown || "";

        // Truncate if too long
        if (fullText.length > 20000) {
            fullText = fullText.substring(0, 20000) + "... (truncated)";
        }

        return {
            content_text: fullText,
            topic_name: contentJson.title || subtopicId
        };
    }

    private async generateFlashcards(state: typeof FlashcardAgentState.State) {
        console.log(`Generating flashcards for: ${state.topic_name}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert educator. Create a set of high-quality flashcards based on the provided text.
            
            Generate 10-15 flashcards that cover key concepts, definitions, and important details.
            
            Output a JSON array of Flashcard objects.
            
            Schema:
            interface Flashcard {
                id: string; // e.g., "fc1"
                front: string; // The question, term, or concept
                back: string; // The answer, definition, or explanation (can include short LaTeX)
                tags?: string[]; // Optional tags
            }
            
            Output ONLY valid JSON.
            `),
            new SystemMessage(`CONTENT:\n\n${state.content_text}`),
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({});

        let flashcards: Flashcard[] = [];
        try {
            flashcards = repairJsonWithLatex((response as any).content);
        } catch (e) {
            console.error("Failed to parse generated flashcards", e);
        }

        return { generated_flashcards: flashcards };
    }

    private async compileSet(state: typeof FlashcardAgentState.State) {
        const flashcards = state.generated_flashcards;

        const set: FlashcardSet = {
            id: `fc-set-${Date.now()}`,
            topicName: state.topic_name,
            createdAt: new Date().toISOString(),
            cards: flashcards
        };

        return { final_flashcard_set: set };
    }

    private async saveFlashcards(state: typeof FlashcardAgentState.State) {
        const set = state.final_flashcard_set as FlashcardSet;
        const subtopicId = state.subtopic_id;
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputDir = path.join(process.cwd(), "generated_content", safeFolderName);

        await fs.ensureDir(outputDir);

        // Save JSON
        await fs.writeFile(path.join(outputDir, "flashcards.json"), JSON.stringify(set, null, 2));

        // Render and Save HTML
        const html = renderFlashcardsToHtml(set);
        await fs.writeFile(path.join(outputDir, "flashcards.html"), html);

        console.log(`Flashcards saved to ${outputDir}/flashcards.json`);
        console.log(`Flashcards HTML saved to ${outputDir}/flashcards.html`);

        return {};
    }
}
