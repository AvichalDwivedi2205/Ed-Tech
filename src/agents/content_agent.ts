import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { TavilySearchTool } from "../tools/search";
import fs from "fs-extra";
import path from "path";

// Define the state
export const ContentAgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    roadmap_json: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    pending_subtopics: Annotation<string[]>({
        reducer: (x, y) => y,
        default: () => [],
    }),
    current_subtopic_id: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    current_subtopic_data: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    generated_content: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    content_complete: Annotation<boolean>({
        reducer: (x, y) => y,
        default: () => false,
    }),
});

export class ContentCreatorAgent {
    private llm: any;
    private searchTool: TavilySearchTool;
    public graph: any;

    constructor() {
        this.llm = getModel(0.7);
        this.searchTool = new TavilySearchTool();
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(ContentAgentState)
            .addNode("load_roadmap", this.loadRoadmap.bind(this))
            .addNode("get_next_subtopic", this.getNextSubtopic.bind(this))
            .addNode("research_content", this.researchContent.bind(this))
            .addNode("generate_content", this.generateContent.bind(this))
            .addNode("save_content", this.saveContent.bind(this))
            .addEdge("__start__", "load_roadmap")
            .addEdge("load_roadmap", "get_next_subtopic")
            .addConditionalEdges("get_next_subtopic", this.checkSubtopicAvailability.bind(this), {
                process: "research_content",
                end: END,
            })
            .addEdge("research_content", "generate_content")
            .addEdge("generate_content", "save_content")
            .addEdge("save_content", "get_next_subtopic");

        return workflow.compile();
    }

    private async loadRoadmap(state: typeof ContentAgentState.State) {
        const roadmapJson = state.roadmap_json;

        // Identify all subtopics. 
        // We assume any key that is an object and has "TopicName" is a subtopic.
        // Or we can just filter out known metadata keys like "TeachingStyle".
        const keys = Object.keys(roadmapJson);
        const pendingSubtopics = keys.filter(key => {
            const val = roadmapJson[key];
            return typeof val === 'object' && val !== null && val.TopicName;
        });

        console.log(`Found ${pendingSubtopics.length} subtopics to process.`);

        return {
            pending_subtopics: pendingSubtopics
        };
    }

    private async getNextSubtopic(state: typeof ContentAgentState.State) {
        const pending = state.pending_subtopics;

        if (pending.length === 0) {
            return {
                current_subtopic_id: "",
                current_subtopic_data: {}
            };
        }

        const nextId = pending[0];
        const remaining = pending.slice(1);
        const subtopicData = state.roadmap_json[nextId];

        return {
            current_subtopic_id: nextId,
            current_subtopic_data: subtopicData,
            pending_subtopics: remaining
        };
    }

    private checkSubtopicAvailability(state: typeof ContentAgentState.State) {
        if (!state.current_subtopic_id) {
            return "end";
        }
        return "process";
    }

    private async researchContent(state: typeof ContentAgentState.State) {
        const subtopicData = state.current_subtopic_data;
        const topicName = subtopicData.TopicName;
        const topics = subtopicData.ContentList?.topics || [];

        console.log(`Researching content for: ${topicName}`);

        let researchResults = "";
        try {
            // Search for the main topic and a few subtopics
            const query = `${topicName} ${topics.slice(0, 3).join(" ")} tutorial explanation`;
            researchResults = await this.searchTool.run(query);
        } catch (e) {
            console.error("Research failed", e);
        }

        return {
            messages: [new SystemMessage(`Research results for ${topicName}:\n${researchResults}`)]
        };
    }

    private async generateContent(state: typeof ContentAgentState.State) {
        const subtopicData = state.current_subtopic_data;
        const topicName = subtopicData.TopicName;
        const messages = state.messages;

        console.log(`Generating content for: ${topicName}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert academic content creator. Generate high-quality, structured study notes in LaTeX format.
        
        Structure the content as follows:
        \\section{Title}
        \\subsection{Introduction}
        Provide a clear and concise introduction to the topic.
        
        \\subsection{Key Concepts}
        Define key terms and concepts. Use \\textbf{} for terms and \\emph{} for emphasis. Use mathematical notation (e.g., $E=mc^2$) where appropriate.
        
        \\subsection{Detailed Explanations}
        Explain the concepts in depth. Use itemized lists (\\begin{itemize} ... \\end{itemize}) or enumerated lists (\\begin{enumerate} ... \\end{enumerate}) for clarity.
        
        \\subsection{Examples}
        Provide concrete examples to illustrate the concepts.
        
        \\subsection{Summary}
        Summarize the main points.
        
        IMPORTANT RULES:
        1. Output ONLY valid LaTeX code. Do not wrap it in markdown code blocks (like \`\`\`latex ... \`\`\`).
        2. Do NOT include any preamble (like \\documentclass, \\begin{document}). Start directly with \\section.
        3. Ensure all mathematical formulas are properly formatted.
        `),
            new HumanMessage(`Generate study notes for: ${topicName}\n\nContext:\n${JSON.stringify(subtopicData)}`),
            new MessagesPlaceholder("messages")
        ]);

        const chain = prompt.pipe(this.llm);
        const response = await chain.invoke({ messages });

        return {
            generated_content: (response as any).content as string
        };
    }

    private async saveContent(state: typeof ContentAgentState.State) {
        const content = state.generated_content;
        const subtopicId = state.current_subtopic_id;

        // Sanitize subtopicId for folder name
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputDir = path.join(process.cwd(), "generated_content", safeFolderName);
        await fs.ensureDir(outputDir);

        await fs.writeFile(path.join(outputDir, "content.tex"), content);
        console.log(`Content saved to ${outputDir}/content.tex`);

        return {
            // We don't set content_complete here anymore, the loop handles it
        };
    }
}
