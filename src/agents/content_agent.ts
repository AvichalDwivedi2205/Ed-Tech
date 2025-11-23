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
            .addNode("research_content", this.researchContent.bind(this))
            .addNode("generate_content", this.generateContent.bind(this))
            .addNode("save_content", this.saveContent.bind(this))
            .addEdge("__start__", "load_roadmap")
            .addConditionalEdges("load_roadmap", this.checkCompletion.bind(this), {
                continue: "research_content",
                end: END,
            })
            .addEdge("research_content", "generate_content")
            .addEdge("generate_content", "save_content")
            .addEdge("save_content", END);

        return workflow.compile();
    }

    private async loadRoadmap(state: typeof ContentAgentState.State) {
        const roadmapJson = state.roadmap_json;

        // Find first incomplete subtopic (simplified logic: just pick one for demo or iterate)
        // In a real app, we'd track completion status in a file or DB.
        // Here, we'll assume the user wants to generate content for a specific subtopic or we iterate.
        // For simplicity in this migration, let's just pick the first subtopic that matches "SubtopicX"

        const subtopicKeys = Object.keys(roadmapJson).filter(k => k.startsWith("Subtopic"));
        // Sort them
        subtopicKeys.sort();

        // Just pick the first one for now to demonstrate the flow
        // In a full implementation, we'd check which ones are already done.
        const currentSubtopicId = subtopicKeys[0];

        if (!currentSubtopicId) {
            return { content_complete: true };
        }

        return {
            current_subtopic_id: currentSubtopicId,
            current_subtopic_data: roadmapJson[currentSubtopicId]
        };
    }

    private checkCompletion(state: typeof ContentAgentState.State) {
        if (state.content_complete || !state.current_subtopic_id) {
            return "end";
        }
        return "continue";
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
            new SystemMessage(`You are an expert educational content creator. Generate comprehensive content for the following subtopic.
        Include:
        - Detailed explanations
        - Examples
        - Code snippets (if applicable)
        - Summary
        
        Use Markdown format.
        `),
            new HumanMessage(`Generate content for: ${topicName}\n\nContext:\n${JSON.stringify(subtopicData)}`),
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

        const outputDir = path.join(process.cwd(), "generated_content", subtopicId);
        await fs.ensureDir(outputDir);

        await fs.writeFile(path.join(outputDir, "content.md"), content);
        console.log(`Content saved to ${outputDir}/content.md`);

        return {
            content_complete: true // Mark as done for this run
        };
    }
}
