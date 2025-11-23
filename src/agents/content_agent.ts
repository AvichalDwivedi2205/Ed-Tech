import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { TavilySearchTool } from "../tools/search";
import { AcademicRetrievalTool } from "../tools/academic_scraper";
import { PerplexitySearchTool } from "../tools/search";
import fs from "fs-extra";
import path from "path";
import { z } from "zod";
import { Doc, Block, ResourcesBlock } from "../types/content_schema";
import { repairJsonWithLatex } from "../utils/json_repair";
import { renderDocToHtml } from "../utils/html_renderer";

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
    sections_content: Annotation<any[]>({ // Array of generated section content objects
        reducer: (x, y) => y, // Overwrite
        default: () => [],
    }),
    final_json: Annotation<any>({
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
            plan = repairJsonWithLatex(content);
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
            
            Output a JSON array of BLOCKS representing the content.
            
            ### SCHEMA DEFINITION
            
            type Block = 
              | HeadingBlock | ParagraphBlock | ListBlock | CalloutBlock | EquationBlock | CodeBlock | ImageBlock | TableBlock | DividerBlock
            
            interface BaseBlock { id: string; type: string; }
            
            interface HeadingBlock extends BaseBlock { type: "heading"; level: 1|2|3|4; content: InlineSpan[]; }
            interface ParagraphBlock extends BaseBlock { type: "paragraph"; content: InlineSpan[]; }
            
            interface ListBlock extends BaseBlock { type: "list"; style: "ordered"|"bullet"; items: ListItem[]; }
            interface ListItem { content: InlineSpan[]; children?: ListItem[]; }
            
            interface CalloutBlock extends BaseBlock { 
                type: "callout"; 
                variant: "example"|"note"|"warning"|"info"; 
                title?: InlineSpan[]; 
                icon?: string; 
                content: InlineSpan[]; 
            }
            
            interface EquationBlock extends BaseBlock { type: "equation"; math: string; display?: "block"|"inline"; }
            interface CodeBlock extends BaseBlock { type: "code"; language?: string; code: string; }
            
            interface InlineSpan {
                text: string;
                bold?: boolean;
                italic?: boolean;
                underline?: boolean;
                strike?: boolean;
                code?: boolean;
                subscript?: boolean;
                superscript?: boolean;
                color?: string;
                link?: { url: string; title?: string; };
                mathInline?: string;
            }

            ### CRITICAL JSON FORMATTING RULES
            ⚠️ ABSOLUTELY NO COMMENTS, NO EXPLANATIONS, NO MARKDOWN CODE BLOCKS ⚠️
            - Output ONLY pure, valid JSON array starting with '[' and ending with ']'
            - NO comments (no //, no /* */, no *//, no explanations before/after)
            - NO markdown code fences - do not wrap output in code blocks
            - NO text before or after the JSON array
            - The response must be parseable by JSON.parse() directly
            
            ### CONTENT RULES
            1. Content must be EXTENSIVE (2000+ words equivalent).
            2. Use "equation" blocks for main formulas. Use "mathInline" span for inline math.
            3. STRICTLY ESCAPE LATEX BACKSLASHES in JSON strings. 
               Example: "\\lambda" must be written as "\\\\lambda". 
               Example: "\\frac{a}{b}" must be written as "\\\\frac{a}{b}".
            4. Do not use markdown for bold/italic. Use the Span object properties.
            5. Every block MUST have an "id" field (use unique IDs like "b1", "b2", etc.)
            
            ### EXAMPLE OUTPUT
            [
                {
                    "id": "b1",
                    "type": "heading",
                    "level": 2,
                    "content": [{ "text": "The Inherent Challenge" }]
                },
                {
                    "id": "b2",
                    "type": "paragraph",
                    "content": [
                        { "text": "Antenna Size Requirements: ", "bold": true },
                        { "text": "for efficient radiation, antenna length must be a fraction of the wavelength ", "italic": true },
                        { "text": "λ = c / f", "mathInline": "\\\\lambda = \\\\frac{c}{f}" }
                    ]
                },
                {
                    "id": "b3",
                    "type": "equation",
                    "math": "\\\\lambda = \\\\frac{c}{f}",
                    "display": "block"
                }
            ]
            `),
            new MessagesPlaceholder("messages")
        ]);

        // Use lower temperature model for structured JSON output
        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({ messages: state.messages });

        let sectionBlocks: Block[] = [];
        try {
            const content = (response as any).content;
            const parsed = repairJsonWithLatex(content);

            // Ensure we got an array
            if (!Array.isArray(parsed)) {
                throw new Error("Parsed JSON is not an array");
            }

            // Validate blocks have required fields and add IDs if missing
            sectionBlocks = parsed.map((block: any, idx: number) => {
                if (!block || typeof block !== 'object' || !block.type) {
                    console.warn("Skipping invalid block:", block);
                    return null;
                }
                // Ensure block has an ID
                if (!block.id) {
                    block.id = `block-${Date.now()}-${idx}`;
                }
                return block;
            }).filter((block: any) => block !== null);

            if (sectionBlocks.length === 0) {
                throw new Error("No valid blocks found in parsed JSON");
            }
        } catch (e: any) {
            console.error(`Failed to parse section JSON for ${section.title}:`, e.message);
            // Fallback to a simple paragraph block with the raw content
            const rawContent = (response as any).content;
            // Try to extract some text from the raw content if it's not valid JSON
            const textContent = rawContent.length > 5000
                ? rawContent.substring(0, 5000) + "... (truncated due to parsing error)"
                : rawContent;

            sectionBlocks = [
                {
                    id: `error-fallback-${Date.now()}`,
                    type: "paragraph",
                    content: [{ text: `[Content generation error for "${section.title}"]\n\n${textContent}` }]
                } as any
            ];
        }

        return {
            sections_content: [...state.sections_content, ...sectionBlocks] // Append new blocks
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

        const resourcesBlock: ResourcesBlock = {
            id: `res-${Date.now()}`,
            type: "resources",
            items: resources
        };

        // Append resources block to the end of the content
        const updatedSections = [...allSections, resourcesBlock];

        return {
            sections_content: updatedSections,
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
        const doc: Doc = {
            id: state.current_subtopic_id,
            title: subtopicData.TopicName,
            meta: {
                topic: subtopicData.TopicName,
                createdAt: new Date().toISOString()
            },
            blocks: state.sections_content
        };
        return { final_json: doc };
    }

    private async saveContent(state: typeof ContentAgentState.State) {
        const doc = state.final_json as Doc;
        const content = JSON.stringify(doc, null, 2);
        const html = renderDocToHtml(doc);

        const subtopicId = state.current_subtopic_id;
        const safeFolderName = subtopicId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputDir = path.join(process.cwd(), "generated_content", safeFolderName);

        await fs.ensureDir(outputDir);
        await fs.writeFile(path.join(outputDir, "content.json"), content);
        await fs.writeFile(path.join(outputDir, "index.html"), html);

        console.log(`Content saved to ${outputDir}/content.json`);
        console.log(`HTML viewer saved to ${outputDir}/index.html`);

        return {};
    }
    private parseSectionContent(text: string, defaultTitle: string): any {
        const lines = text.split('\n');
        let title = defaultTitle;
        const contentBlocks: any[] = [];

        let currentBlock: any = null;
        let buffer: string[] = [];
        let capturing = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("SECTION_TITLE:")) {
                title = trimmed.replace("SECTION_TITLE:", "").trim();
                continue;
            }

            if (trimmed.startsWith("TYPE:")) {
                if (currentBlock) {
                    // Save previous block
                    currentBlock.data = buffer.join('\n').trim();
                    contentBlocks.push(currentBlock);
                }
                // Start new block
                const type = trimmed.replace("TYPE:", "").trim().toLowerCase();
                currentBlock = { type: type };
                buffer = [];
                capturing = false;
                continue;
            }

            if (trimmed.startsWith("TITLE:") && currentBlock && currentBlock.type === 'example') {
                currentBlock.title = trimmed.replace("TITLE:", "").trim();
                continue;
            }

            if (trimmed === "CONTENT:") {
                capturing = true;
                continue;
            }

            if (trimmed === "END_CONTENT") {
                capturing = false;
                continue;
            }

            if (capturing) {
                buffer.push(line);
            }
        }

        // Push last block
        if (currentBlock) {
            currentBlock.data = buffer.join('\n').trim();
            contentBlocks.push(currentBlock);
        }

        // Fallback if parsing failed to find structure
        if (contentBlocks.length === 0) {
            return {
                title: title,
                content: [{ type: "text", data: text }]
            };
        }

        return {
            title: title,
            content: contentBlocks
        };
    }
    private parseSecureJson(text: string): any {
        // Remove markdown code blocks
        let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // Try parsing directly first
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            // If failed, try to fix common LaTeX escape issues
            // Replace single backslashes with double backslashes, but be careful not to break already escaped ones?
            // Actually, it's hard to distinguish. 
            // Let's try to replace \ with \\ if it's followed by a letter or special char and not another \
            // This is a heuristic.

            // A better approach for the LLM is to strictly enforce double escaping. 
            // But if it fails, we can try to sanitize.

            // Regex to find single backslashes that look like LaTeX commands
            // e.g. \section -> \\section
            // But JSON.parse expects \\section in the string literal to mean \section in the data.
            // If the LLM wrote "\section", JSON.parse fails because \s is not a valid escape (unless it is? \s is not, \n is).

            // Let's try to escape all backslashes that are not valid JSON escapes.
            // Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX

            // This regex finds backslashes that are NOT followed by " \ / b f n r t u
            const fixedText = cleanText.replace(/\\([^"\\/bfnrtu])/g, "\\\\$1");

            try {
                return JSON.parse(fixedText);
            } catch (e2) {
                throw e; // Throw original error if fix fails
            }
        }
    }
}
