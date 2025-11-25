import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { TavilySearchTool } from "../tools/search";
import { AcademicRetrievalTool } from "../tools/academic_scraper";
import { PerplexitySearchTool } from "../tools/search";
import fs from "fs-extra";
import path from "path";
import { AgentResponse } from "../types/content_schema";
import { renderMarkdownToHtml } from "../utils/html_renderer";

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
    // New state for deep content generation
    content_plan: Annotation<any[]>({ // Array of section objects { title, description }
        reducer: (x, y) => y,
        default: () => [],
    }),
    current_section_index: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
    sections_content: Annotation<string[]>({ // Array of generated markdown strings
        reducer: (x, y) => x.concat(y), // Append
        default: () => [],
    }),
    final_json: Annotation<AgentResponse | {}>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    completed_subtopics: Annotation<string[]>({
        reducer: (x, y) => y,
        default: () => [],
    }),
});

export class ContentCreatorAgent {
    private llm: any;
    private llmStructured: any; // Lower temperature for JSON generation
    private searchTool: TavilySearchTool;
    private academicTool: AcademicRetrievalTool;
    private perplexityTool: PerplexitySearchTool;
    public graph: any;

    constructor() {
        this.llm = getModel(0.7);
        this.llmStructured = getModel(0.2); // Lower temperature for structured JSON output
        this.searchTool = new TavilySearchTool();
        this.academicTool = new AcademicRetrievalTool();
        this.perplexityTool = new PerplexitySearchTool();
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(ContentAgentState)
            .addNode("load_roadmap", this.loadRoadmap.bind(this))
            .addNode("get_next_subtopic", this.getNextSubtopic.bind(this))
            .addNode("research_content", this.researchContent.bind(this))
            .addNode("plan_outline", this.planOutline.bind(this))
            .addNode("generate_section", this.generateSection.bind(this))
            .addNode("find_resources", this.findResources.bind(this))
            .addNode("compile_json", this.compileJson.bind(this))
            .addNode("save_content", this.saveContent.bind(this))

            // Outer loop: Subtopics
            .addEdge("__start__", "load_roadmap")
            .addEdge("load_roadmap", "get_next_subtopic")
            .addConditionalEdges("get_next_subtopic", this.checkSubtopicAvailability.bind(this), {
                process: "research_content",
                end: END,
            })

            // Inner loop: Sections
            .addEdge("research_content", "plan_outline")
            .addEdge("plan_outline", "generate_section")
            .addEdge("generate_section", "find_resources")
            .addConditionalEdges("find_resources", this.checkSectionCompletion.bind(this), {
                next_section: "generate_section",
                complete: "compile_json",
            })

            .addEdge("compile_json", "save_content")
            .addEdge("save_content", END);

        return workflow.compile();
    }

    // --- Subtopic Management ---

    private async loadRoadmap(state: typeof ContentAgentState.State) {
        const roadmapJson = state.roadmap_json;
        const keys = Object.keys(roadmapJson);
        let completed = state.completed_subtopics || [];

        // Check for existing content on disk to avoid re-generating
        const generatedDir = path.join(process.cwd(), "generated_content");
        if (await fs.pathExists(generatedDir)) {
            for (const key of keys) {
                const val = roadmapJson[key];
                if (typeof val === 'object' && val !== null && val.TopicName) {
                    const safeFolderName = key.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const contentPath = path.join(generatedDir, safeFolderName, "content.json");

                    if (await fs.pathExists(contentPath)) {
                        if (!completed.includes(key)) {
                            completed = [...completed, key];
                        }
                    }
                }
            }
        }

        const pendingSubtopics = keys.filter(key => {
            const val = roadmapJson[key];
            return typeof val === 'object' && val !== null && val.TopicName && !completed.includes(key);
        });

        console.log(`Found ${pendingSubtopics.length} pending subtopics.`);
        if (completed.length > 0) {
            console.log(`Skipping ${completed.length} already generated subtopics.`);
        }

        return {
            pending_subtopics: pendingSubtopics,
            completed_subtopics: completed
        };
    }

    private async getNextSubtopic(state: typeof ContentAgentState.State) {
        const pending = state.pending_subtopics;
        if (pending.length === 0) {
            return { current_subtopic_id: "", current_subtopic_data: {} };
        }
        const nextId = pending[0];
        const remaining = pending.slice(1);
        const subtopicData = state.roadmap_json[nextId];

        // Reset section state for new subtopic
        return {
            current_subtopic_id: nextId,
            current_subtopic_data: subtopicData,
            pending_subtopics: remaining,
            content_plan: [],
            current_section_index: 0,
            sections_content: [],
            final_json: {}
        };
    }

    private checkSubtopicAvailability(state: typeof ContentAgentState.State) {
        return state.current_subtopic_id ? "process" : "end";
    }

    // --- Content Generation Logic ---

    private async researchContent(state: typeof ContentAgentState.State) {
        const subtopicData = state.current_subtopic_data;
        const topicName = subtopicData.TopicName;
        console.log(`Researching content for: ${topicName}`);

        // We use the existing research logic but maybe fetch more
        const topics = subtopicData.ContentList?.topics || [];
        const query = `${topicName} ${topics.slice(0, 3).join(" ")} tutorial explanation`;

        const [generalRes, academicResources] = await Promise.all([
            this.searchTool.run(query),
            this.academicTool.retrieve(topicName)
        ]);

        let academicContext = "";
        if (academicResources.length > 0) {
            academicContext = "=== ACADEMIC RESOURCES ===\n\n";
            academicResources.forEach((res, idx) => {
                academicContext += `[${idx + 1}] Title: ${res.title}\nURL: ${res.url}\nSource: ${res.sourceDomain}\nContent: ${res.snippet || res.content}\n\n`;
            });
        }

        return {
            messages: [new SystemMessage(`Research results for ${topicName}:\n\n${generalRes}\n\n${academicContext}`)]
        };
    }

    private async planOutline(state: typeof ContentAgentState.State) {
        const topicName = state.current_subtopic_data.TopicName;
        console.log(`Planning outline for: ${topicName}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert curriculum designer. Create a detailed outline for a comprehensive course module on "${topicName}".
            The content must be very deep and detailed, suitable for a university-level course.
            
            Generate a JSON array of section objects. Each object should have:
            - "title": Section title
            - "description": Brief description of what to cover
            
            Example:
            [
                { "title": "Introduction to X", "description": "..." },
                { "title": "Mathematical Foundations", "description": "..." },
                ...
            ]
            
            Create at least 6-8 substantial sections to ensure depth.
            Output ONLY the JSON array. NO comments, NO explanations, NO markdown code blocks. Pure JSON only.`),
            new MessagesPlaceholder("messages")
        ]);

        // Use lower temperature model for structured JSON output
        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({ messages: state.messages });

        let plan = [];
        try {
            const content = (response as any).content;
            // Clean markdown code blocks if present
            // We still use JSON for the outline plan itself
            const jsonContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
            plan = JSON.parse(jsonContent);
        } catch (e) {
            console.error("Failed to parse outline JSON", e);
            // Fallback plan
            plan = [
                { title: "Introduction", description: "Overview of the topic" },
                { title: "Core Concepts", description: "Key principles and definitions" },
                { title: "Advanced Theory", description: "In-depth theoretical analysis" },
                { title: "Practical Applications", description: "Real-world use cases" },
                { title: "Summary", description: "Conclusion and review" }
            ];
        }

        return { content_plan: plan, current_section_index: 0 };
    }

    private async generateSection(state: typeof ContentAgentState.State) {
        const plan = state.content_plan;
        const index = state.current_section_index;
        const section = plan[index];
        const topicName = state.current_subtopic_data.TopicName;

        console.log(`Generating section ${index + 1}/${plan.length}: ${section.title}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert academic content creator. Write deep, detailed content for the section "${section.title}" of the module "${topicName}".
            
            Context: ${section.description}
            
            Output a single **Markdown** document for this section.
            
            ### MARKDOWN DIALECT & EXTENSIONS
            
            1. **Core Markdown**:
               - Use headers: \`#\`, \`##\`, \`###\`
               - Lists: \`-\` or \`1.\`
               - Tables: GFM syntax
               - Bold/Italic: \`**bold**\`, \`*italic*\`
            
            2. **Math**:
               - Inline: \`$E = mc^2$\`
               - Block:
                 $$
                 \\int_0^\\infty x^2 dx
                 $$
            
            3. **Callouts**:
               Use this syntax for special blocks:
               :::info Title
               Content...
               :::
               
               Variants: \`info\`, \`warning\`, \`note\`, \`tip\`.
            
            ### RULES
            - Do NOT wrap the entire output in a markdown block. Just return the markdown text.
            - Content must be EXTENSIVE and detailed.
            - Use proper LaTeX for all math.
            `),
            new MessagesPlaceholder("messages")
        ]);

        // Use standard model for text generation
        const chain = prompt.pipe(this.llm);
        const response = await chain.invoke({ messages: state.messages });

        const content = (response as any).content as string;

        return {
            sections_content: [content] // Append new markdown string
        };
    }

    private async findResources(state: typeof ContentAgentState.State) {
        const index = state.current_section_index;

        const allSections = [...state.sections_content];
        const sectionPlan = state.content_plan[index];
        const sectionTitle = sectionPlan?.title || "Unknown Section";
        const topicName = state.current_subtopic_data.TopicName;

        console.log(`Finding resources for: ${sectionTitle}`);

        let resources: any[] = [];
        try {
            const query = `${topicName} ${sectionTitle} video tutorial article`;

            // Now returns { results: [ { title, url, snippet, ... } ] }
            const rawData = await this.perplexityTool.runRaw(query);

            const searchResults = rawData.results || [];

            resources = searchResults.slice(0, 3).map((res: any) => ({
                kind: res.url.includes("youtube") || res.url.includes("vimeo") ? "video" : "article",
                title: res.title || "External Resource",
                url: res.url
            }));

        } catch (e) {
            console.error("Resource search failed", e);
        }

        const resourcesBlock = `
:::resources
${resources.map(r => `- [${r.kind}] [${r.title}](${r.url})`).join('\n')}
:::
`;

        return {
            sections_content: [resourcesBlock], // Append resources markdown
            current_section_index: index + 1
        };
    }

    private checkSectionCompletion(state: typeof ContentAgentState.State) {
        if (state.current_section_index < state.content_plan.length) {
            return "next_section";
        }
        return "complete";
    }

    private async compileJson(state: typeof ContentAgentState.State) {
        const subtopicData = state.current_subtopic_data;
        const fullMarkdown = state.sections_content.join("\n\n");

        const response: AgentResponse = {
            id: state.current_subtopic_id,
            title: subtopicData.TopicName,
            createdAt: new Date().toISOString(),
            markdown: fullMarkdown
        };
        return { final_json: response };
    }

    private async saveContent(state: typeof ContentAgentState.State) {
        const doc = state.final_json as AgentResponse;
        const content = JSON.stringify(doc, null, 2);

        // We need a new renderer for markdown. For now, we'll just save the markdown file.
        // And a simple HTML preview using a CDN-based script.
        const html = renderMarkdownToHtml(doc.markdown, doc.title);

        const subtopicId = state.current_subtopic_id;
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputDir = path.join(process.cwd(), "generated_content", safeFolderName);

        await fs.ensureDir(outputDir);
        await fs.writeFile(path.join(outputDir, "content.json"), content);
        await fs.writeFile(path.join(outputDir, "content.md"), doc.markdown);
        await fs.writeFile(path.join(outputDir, "index.html"), html);

        console.log(`Content saved to ${outputDir}/content.json`);
        console.log(`Markdown saved to ${outputDir}/content.md`);
        console.log(`HTML viewer saved to ${outputDir}/index.html`);

        return {};
    }

}
