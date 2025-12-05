import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { ShortNote, ShortNotesSet } from "../types/notes_schema";
import { repairJsonWithLatex } from "../utils/json_repair";

// Define the state
export const ShortNotesAgentState = Annotation.Root({
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
    generated_notes: Annotation<ShortNote[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    final_notes_set: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    notes_result: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
});

export class ShortNotesGeneratorAgent {
    private llmStructured: any;
    public graph: any;

    constructor() {
        this.llmStructured = getModel(0.3);
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(ShortNotesAgentState)
            .addNode("load_content", this.loadContent.bind(this))
            .addNode("generate_notes", this.generateNotes.bind(this))
            .addNode("compile_set", this.compileSet.bind(this))
            .addNode("save_notes", this.saveNotes.bind(this))

            .addEdge("__start__", "load_content")
            .addEdge("load_content", "generate_notes")
            .addEdge("generate_notes", "compile_set")
            .addEdge("compile_set", "save_notes")
            .addEdge("save_notes", END);

        return workflow.compile();
    }

    private async loadContent(state: typeof ShortNotesAgentState.State) {
        const contentText = state.content_text;
        const topicName = state.topic_name;

        if (!contentText || contentText.trim().length === 0) {
            throw new Error(`Content text is required for subtopic: ${state.subtopic_id}`);
        }

        // Truncate if too long
        let fullText = contentText;
        if (fullText.length > 25000) {
            fullText = fullText.substring(0, 25000) + "... (truncated)";
        }

        return {
            content_text: fullText,
            topic_name: topicName || state.subtopic_id
        };
    }

    private async generateNotes(state: typeof ShortNotesAgentState.State) {
        console.log(`Generating short notes for: ${state.topic_name}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert educator creating concise study notes for quick revision.
            
            Create SHORT NOTES that capture the essence of the content for quick study.
            These notes should be:
            - Concise but complete
            - Easy to scan quickly
            - Cover all key concepts
            - Include important formulas/equations
            - Include brief examples where helpful
            
            Generate 8-12 short note cards based on the content.
            
            Output a JSON array of ShortNote objects.
            
            Schema:
            interface ShortNote {
                id: string;           // e.g., "note1", "note2"
                title: string;        // Brief title (3-6 words)
                keyPoints: string[];  // 3-5 bullet points of key information
                summary: string;      // 2-3 sentence summary
                formula?: string;     // Optional: key formula in LaTeX (use $...$ for inline)
                example?: string;     // Optional: quick 1-2 line example
                tags?: string[];      // Optional: relevant tags
            }
            
            Example output:
            [
                {
                    "id": "note1",
                    "title": "Vector Dot Product",
                    "keyPoints": [
                        "Measures similarity between vectors",
                        "Result is a scalar value",
                        "Commutative: a·b = b·a",
                        "Distributive over addition"
                    ],
                    "summary": "The dot product multiplies corresponding components and sums them. It equals zero for perpendicular vectors and is maximum for parallel vectors.",
                    "formula": "$\\\\mathbf{a} \\\\cdot \\\\mathbf{b} = \\\\sum_{i=1}^{n} a_i b_i = ||\\\\mathbf{a}|| ||\\\\mathbf{b}|| \\\\cos\\\\theta$",
                    "example": "For a=[1,2,3] and b=[4,5,6]: a·b = 1×4 + 2×5 + 3×6 = 32",
                    "tags": ["linear-algebra", "vectors", "operations"]
                }
            ]
            
            Output ONLY valid JSON. NO comments or explanations.
            `),
            new SystemMessage(`CONTENT TO SUMMARIZE:\n\n${state.content_text}`),
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({});

        let notes: ShortNote[] = [];
        try {
            notes = repairJsonWithLatex((response as any).content);
            // Ensure it's an array
            if (!Array.isArray(notes)) {
                throw new Error("Parsed result is not an array");
            }
        } catch (e) {
            console.error("Failed to parse generated notes", e);
            // Fallback
            notes = [{
                id: "note1",
                title: state.topic_name,
                keyPoints: ["Content is being generated..."],
                summary: "Short notes for this topic are being prepared.",
                tags: ["general"]
            }];
        }

        return { generated_notes: notes };
    }

    private async compileSet(state: typeof ShortNotesAgentState.State) {
        const notes = state.generated_notes;

        const set: ShortNotesSet = {
            id: `notes-set-${Date.now()}`,
            topicName: state.topic_name,
            createdAt: new Date().toISOString(),
            notes: notes,
            totalNotes: notes.length
        };

        return { final_notes_set: set };
    }

    private async saveNotes(state: typeof ShortNotesAgentState.State) {
        const set = state.final_notes_set as ShortNotesSet;
        
        console.log(`Short notes generated for subtopic: ${state.subtopic_id} (${set.totalNotes} notes)`);
        
        return {
            notes_result: set
        };
    }
}
