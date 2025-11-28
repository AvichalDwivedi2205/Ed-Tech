import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { Flashcard, FlashcardSet } from "../types/flashcard_schema";
import { repairJsonWithLatex } from "../utils/json_repair";
// Removed fs, path, and renderFlashcardsToHtml imports - no longer needed for Convex integration

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
    flashcard_result: Annotation<any>({
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
        // Content should be provided via state instead of loading from filesystem
        // This method now just validates that content_text is available
        const contentText = state.content_text;
        const topicName = state.topic_name;

        if (!contentText || contentText.trim().length === 0) {
            throw new Error(`Content text is required for subtopic: ${state.subtopic_id}`);
        }

        // Truncate if too long
        let fullText = contentText;
        if (fullText.length > 20000) {
            fullText = fullText.substring(0, 20000) + "... (truncated)";
        }

        return {
            content_text: fullText,
            topic_name: topicName || state.subtopic_id
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
        
        // Return the flashcard data instead of saving to filesystem
        // The Convex action will handle saving to the database
        console.log(`Flashcards generated for subtopic: ${state.subtopic_id}`);
        
        return {
            // Return the flashcard data for the caller to save
            flashcard_result: set
        };
    }
}
