import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { OCRTool } from "../tools/ocr";
import { PerplexitySearchTool, TavilySearchTool } from "../tools/search";

// Define the state using Annotation
export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    clarification_count: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
    ocr_text: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    user_input: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    roadmap_context: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    final_roadmap: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    waiting_for_response: Annotation<boolean>({
        reducer: (x, y) => y,
        default: () => false,
    }),
    file_path: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
});

export class RoadmapGeneratorAgent {
    private llm: any;
    private ocrTool: OCRTool;
    private searchTool: PerplexitySearchTool;
    private tavilyTool: TavilySearchTool;
    private maxClarifications = 3;
    public graph: any;

    constructor() {
        this.llm = getModel(0.7);
        this.ocrTool = new OCRTool();
        this.searchTool = new PerplexitySearchTool();
        this.tavilyTool = new TavilySearchTool();
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(AgentState)
            .addNode("check_input", this.checkInput.bind(this))
            .addNode("run_ocr", this.runOcr.bind(this))
            .addNode("ask_clarification", this.askClarification.bind(this))
            .addNode("generate_roadmap", this.generateRoadmap.bind(this))
            .addEdge("__start__", "check_input")
            .addConditionalEdges("check_input", this.shouldRunOcr.bind(this), {
                ocr: "run_ocr",
                clarify: "ask_clarification",
                generate: "generate_roadmap",
            })
            .addEdge("run_ocr", "ask_clarification")
            .addConditionalEdges("ask_clarification", this.shouldContinueClarifying.bind(this), {
                clarify: "ask_clarification",
                generate: "generate_roadmap",
                end: END,
            })
            .addEdge("generate_roadmap", END);

        return workflow.compile();
    }

    private async checkInput(state: typeof AgentState.State) {
        const ocrText = state.ocr_text;
        const messages = state.messages;

        if (ocrText) {
            // Validate OCR text
            if (ocrText.length < 50 || ocrText.trim().length === 0) {
                return {
                    ocr_text: "", // Clear invalid text
                    roadmap_context: "",
                    messages: [
                        ...messages,
                        new SystemMessage(`User provided a file, but OCR extraction failed to produce meaningful content (length < 50 chars). Proceeding with general roadmap generation.`),
                        new AIMessage("I couldn't extract enough meaningful text from the file you uploaded. I will proceed by asking you some questions to generate a personalized roadmap instead.")
                    ],
                };
            }

            return {
                roadmap_context: ocrText,
                messages: [
                    ...messages,
                    new SystemMessage(`User has provided a roadmap document. Extracted text: ${ocrText.substring(0, 500)}...`),
                ],
            };
        }
        return {};
    }

    private shouldRunOcr(state: typeof AgentState.State) {
        const ocrText = state.ocr_text;
        const clarificationCount = state.clarification_count;
        const filePath = state.file_path;

        if (filePath && !ocrText) {
            return "ocr";
        }

        // Always clarify at least once, regardless of file upload
        if (clarificationCount === 0) {
            return "clarify";
        }

        return "generate";
    }

    private async runOcr(state: typeof AgentState.State) {
        const filePath = state.file_path;
        if (!filePath) return {};

        try {
            console.log("Running OCR on:", filePath);
            const ocrText = await this.ocrTool.run(filePath);

            // Validate OCR text here as well to be safe
            if (ocrText.length < 50 || ocrText.trim().length === 0) {
                return {
                    ocr_text: "", // Clear invalid text
                    roadmap_context: "",
                    messages: [
                        ...state.messages,
                        new SystemMessage(`OCR extraction result was too short or empty.`),
                        new AIMessage("I couldn't extract enough meaningful text from the file you uploaded. I will proceed by asking you some questions to generate a personalized roadmap instead.")
                    ],
                };
            }

            return {
                ocr_text: ocrText,
                roadmap_context: ocrText,
                messages: [
                    ...state.messages,
                    new SystemMessage(`OCR extracted text: ${ocrText.substring(0, 500)}...`),
                ],
            };
        } catch (error: any) {
            return {
                ocr_text: "", // Ensure it's empty on error
                messages: [...state.messages, new AIMessage(`OCR failed: ${error.message}. Proceeding with manual input.`)],
            };
        }
    }

    private async askClarification(state: typeof AgentState.State) {
        const clarificationCount = state.clarification_count;
        const messages = state.messages;

        // If we have already asked the question once (count > 0) and received an answer, we are ready to generate.
        if (clarificationCount > 0) {
            return {
                messages: [...messages, new AIMessage("I have enough information. Generating your roadmap...")],
            };
        }

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are a helpful roadmap generator assistant.
            
            Your goal is to gather all necessary information to create a personalized learning roadmap in ONE go.
            
            Ask a SINGLE, comprehensive question that covers:
            1. Their preferred teaching/learning style (e.g., fast-paced, in-depth, visual, etc.)
            2. Their current skill level (beginner, intermediate, advanced)
            3. Their specific learning goals or areas of focus
            
            Do NOT ask multiple questions one by one. Ask ONE combined question.
            `),
            new MessagesPlaceholder("messages"),
        ]);

        const chain = prompt.pipe(this.llm);
        const response = await chain.invoke({ messages });

        return {
            clarification_count: clarificationCount + 1,
            messages: [...messages, response],
            waiting_for_response: true,
        };
    }

    private shouldContinueClarifying(state: typeof AgentState.State) {
        const waiting = state.waiting_for_response;
        const clarificationCount = state.clarification_count;

        if (waiting) {
            return "end"; // Wait for user input
        }

        // If we have completed at least 1 round of clarification (asked question + got answer), we generate.
        // Note: clarification_count is incremented when we ASK the question.
        // So if count is 1, we asked once. If we are here, we received an answer (waiting=false).
        if (clarificationCount >= 1) {
            return "generate";
        }

        return "clarify";
    }

    private async generateRoadmap(state: typeof AgentState.State) {
        const userInput = state.user_input;
        const messages = state.messages;
        const roadmapContext = state.roadmap_context;

        console.log("Generating roadmap...");

        // 1. Generate Outline
        const outlinePrompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert at breaking down learning topics into logical subtopics. Create a structured outline.
            
            ${roadmapContext ? `IMPORTANT: The user has provided a roadmap document/syllabus. You MUST base the outline PRIMARILY on this content:
            ${roadmapContext}` : ""}
            `),
            new HumanMessage(userInput)
        ]);
        const outlineChain = outlinePrompt.pipe(this.llm);
        const outlineResponse = await outlineChain.invoke({});
        const outline = (outlineResponse as any).content as string;

        // 2. Search for resources (Simplified for brevity, but using tools)
        // We will do a general search for now to demonstrate integration
        let searchResults = "";
        try {
            searchResults = await this.tavilyTool.run(`${userInput} learning resources tutorial course`);
        } catch (e) {
            console.error("Search failed", e);
        }

        // 3. Generate Final JSON
        const finalPrompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert roadmap generator. Create a comprehensive learning roadmap in JSON format ONLY.
        You are to **Very Very Strictly** follow the structure provided below:
        Structure:
        {
          "title": "string - A concise, descriptive title for this learning roadmap (e.g., 'Machine Learning Fundamentals Roadmap' or 'Communication Systems Course Roadmap')",
          "TeachingStyle": "string",
          "RoadmapTitle": "string",
          "Subtopic1": {
            "TopicName": "string",
            "ContentList": {
              "videos": [
                { "title": "string", "url": "string", "description": "string" }
              ],
              "blogs": [
                { "title": "string", "url": "string", "description": "string" }
              ],
              "books": [
                { "title": "string", "author": "string", "description": "string" }
              ],
              "topics": [ "string", "string" ]
            },
            "SuggestedTimeToComplete": "string"
          },
          "Subtopic2": { ... }
        }
        
        ${roadmapContext ? `CRITICAL INSTRUCTION: The user has uploaded a specific syllabus/roadmap document. You MUST follow this document's structure and topics exactly.
        
        Roadmap Document Content:
        ${roadmapContext}
        
        Use the above content as the PRIMARY source of truth for topics and structure.` : ""}
        
        Use these search results if relevant:
        ${searchResults}
        
        Outline:
        ${outline}
        
        IMPORTANT: Output ONLY valid JSON. Do not wrap in markdown code blocks. Ensure the "SubtopicX" keys follow a pattern like "Subtopic1", "Subtopic2", etc., or use descriptive unique keys if more appropriate, but the VALUES must match the structure above EXACTLY.
        `),
            new MessagesPlaceholder("messages")
        ]);

        const chain = finalPrompt.pipe(this.llm);
        const response = await chain.invoke({ messages });

        let content = (response as any).content as string;

        // Clean JSON output (remove markdown code blocks)
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();

        // Parse JSON to return structured data
        let roadmapJson: any;
        try {
            roadmapJson = JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse roadmap JSON", e);
            throw new Error("Failed to generate valid roadmap JSON");
        }

        return {
            final_roadmap: roadmapJson, // Return parsed JSON object instead of string
            messages: [...messages, response]
        };
    }
}
