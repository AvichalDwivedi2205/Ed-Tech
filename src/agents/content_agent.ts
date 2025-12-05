import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { TavilySearchTool } from "../tools/search";
import { AcademicRetrievalTool } from "../tools/academic_scraper";
import { PerplexitySearchTool } from "../tools/search";
// Removed fs and path imports - no longer needed for Convex integration
import { AgentResponse, ContentGenerationSettings, SlideContent, SlideType } from "../types/content_schema";
// Removed renderMarkdownToHtml import - no longer needed for Convex integration
import { RAGService } from "../services/rag_service";
import { getConvexClient, getWorkspaceId } from "../utils/convex_client";
import { repairJsonWithLatex } from "../utils/json_repair";

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
    // Updated state for slide-based content generation
    content_plan: Annotation<any[]>({ // Array of section objects { title, description }
        reducer: (x, y) => y,
        default: () => [],
    }),
    current_section_index: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
    slides: Annotation<SlideContent[]>({ // Array of slide objects
        reducer: (x, y) => x.concat(y), // Append new slides
        default: () => [],
    }),
    sections_content: Annotation<string[]>({ // Array of generated markdown strings (legacy)
        reducer: (x, y) => x.concat(y), // Append
        default: () => [],
    }),
    final_json: Annotation<AgentResponse | {}>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    content_result: Annotation<AgentResponse | {}>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    completed_subtopics: Annotation<string[]>({
        reducer: (x, y) => y,
        default: () => [],
    }),
    ragContext: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    webContext: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    settings: Annotation<ContentGenerationSettings | {}>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
});

export class ContentCreatorAgent {
    private llm: any;
    private llmStructured: any; // Lower temperature for JSON generation
    private searchTool: TavilySearchTool;
    private academicTool: AcademicRetrievalTool;
    private perplexityTool: PerplexitySearchTool;
    private ragService: RAGService | null = null;
    public graph: any;

    constructor(settings?: ContentGenerationSettings) {
        this.llm = getModel(0.7);
        this.llmStructured = getModel(0.2); // Lower temperature for structured JSON output
        this.searchTool = new TavilySearchTool();
        this.academicTool = new AcademicRetrievalTool();
        this.perplexityTool = new PerplexitySearchTool();
        
        // Initialize RAG service if settings provided
        if (settings?.useRag) {
            try {
                const convexUrl = process.env.CONVEX_URL || "";
                const workspaceId = settings.workspaceId || getWorkspaceId();
                this.ragService = new RAGService(convexUrl, workspaceId);
            } catch (error) {
                console.warn("Failed to initialize RAG service:", error);
            }
        }
        
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
        const completed = state.completed_subtopics || [];
        const targetSubtopicId = state.current_subtopic_id; // If a specific subtopic was requested

        // Filter out completed subtopics - completed list should be provided externally
        let pendingSubtopics = keys.filter(key => {
            const val = roadmapJson[key];
            return typeof val === 'object' && val !== null && val.TopicName && !completed.includes(key);
        });

        // If a specific subtopic was requested, only process that one
        if (targetSubtopicId && pendingSubtopics.includes(targetSubtopicId)) {
            console.log(`Generating content for specific subtopic: ${targetSubtopicId}`);
            pendingSubtopics = [targetSubtopicId];
        } else if (targetSubtopicId) {
            console.log(`Requested subtopic ${targetSubtopicId} not found in pending list. Using first available.`);
        }

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
            slides: [],
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
        const settings = state.settings as ContentGenerationSettings;
        console.log(`Researching content for: ${topicName}`);

        const topics = subtopicData.ContentList?.topics || [];
        const query = `${topicName} ${topics.slice(0, 3).join(" ")} tutorial explanation`;

        let ragContext = "";
        let webContext = "";

        // RAG retrieval
        if (settings?.useRag && this.ragService) {
            try {
                const ragNamespace = settings.ragNamespace || "general";
                console.log(`  Retrieving RAG context from namespace: ${ragNamespace}`);
                const ragResult = await this.ragService.retrieve(query, ragNamespace, 20);
                ragContext = ragResult.formattedContext;
                console.log(`  Retrieved ${ragResult.chunks.length} RAG chunks`);
            } catch (error: any) {
                console.error(`  RAG retrieval failed: ${error.message}`);
            }
        }

        // Web search (only if useWebSearch is true)
        if (settings?.useWebSearch !== false) {
            // Default behavior: use web search unless explicitly disabled
            try {
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

                webContext = `=== WEB SEARCH RESULTS ===\n\n${generalRes}\n\n${academicContext}`;
            } catch (error: any) {
                console.error(`  Web search failed: ${error.message}`);
            }
        }

        // Combine contexts
        const contextParts: string[] = [];
        if (ragContext) {
            contextParts.push(ragContext);
        }
        if (webContext) {
            contextParts.push(webContext);
        }

        const combinedContext = contextParts.length > 0 
            ? contextParts.join("\n\n")
            : `Research context for ${topicName}`;

        return {
            messages: [new SystemMessage(`Research results for ${topicName}:\n\n${combinedContext}`)],
            ragContext,
            webContext,
        };
    }

    private async planOutline(state: typeof ContentAgentState.State) {
        const topicName = state.current_subtopic_data.TopicName;
        console.log(`Planning outline for: ${topicName}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert curriculum designer. Create a detailed outline for a comprehensive course module on "${topicName}".
            The content will be presented as lecture slides, so structure for clear, focused sections.
            
            Generate a JSON array of section objects. Each object should have:
            - "title": Section title (concise but descriptive)
            - "description": Detailed description of what to cover (include key concepts, formulas, examples needed)
            - "slideCount": Number of slides needed (3-5 slides per section for rich content)
            
            Example:
            [
                { "title": "Introduction & Foundations", "description": "Overview of the topic, motivation, and prerequisite concepts. Cover definitions, historical context, and why this matters.", "slideCount": 3 },
                { "title": "Core Principles & Theory", "description": "Fundamental concepts with mathematical foundations. Include key theorems, formulas, and visual representations.", "slideCount": 4 },
                { "title": "Practical Implementation", "description": "Hands-on examples with code. Show step-by-step implementation with Python/NumPy examples.", "slideCount": 4 },
                { "title": "Advanced Applications", "description": "Real-world use cases and advanced techniques. Show how concepts apply to actual ML problems.", "slideCount": 3 },
                { "title": "Practice & Review", "description": "Practice problems, exercises, and key takeaways summary.", "slideCount": 3 }
            ]
            
            Create 5 comprehensive sections to ensure thorough coverage.
            Each section should generate 3-5 slides (multiple theory slides, examples, and practice).
            Total should be 15-20 slides for a complete module.
            
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
                { title: "Introduction", description: "Overview of the topic", slideCount: 2 },
                { title: "Core Concepts", description: "Key principles and definitions", slideCount: 3 },
                { title: "Practical Applications", description: "Real-world use cases", slideCount: 3 },
                { title: "Summary", description: "Conclusion and review", slideCount: 2 }
            ];
        }

        return { content_plan: plan, current_section_index: 0, slides: [] };
    }

    private async generateSection(state: typeof ContentAgentState.State) {
        const plan = state.content_plan;
        const index = state.current_section_index;
        const section = plan[index];
        const topicName = state.current_subtopic_data.TopicName;
        const existingSlides = state.slides || [];
        const startSlideNum = existingSlides.length + 1;

        console.log(`Generating slides for section ${index + 1}/${plan.length}: ${section.title}`);

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert academic content creator. Create lecture slides for the section "${section.title}" of the module "${topicName}".
            
            Context: ${section.description}
            
            Generate a JSON array of slides. Each slide should have:
            - "type": One of "theory", "example", "question", "exercise", or "summary"
            - "title": Slide title (concise, 5-10 words)
            - "content": Rich Markdown content (aim for 200-400 words per slide with substantial explanations)
            
            Generate ${section.slideCount || 4} slides for this section following this pattern:
            1. First slide(s): "theory" - Explain concepts in depth with definitions, key points, and context
            2. Middle slides: "example" - Show detailed practical examples with full code blocks and step-by-step explanations
            3. Last slide: "question" or "exercise" - Include practice problems with hints or partial solutions
            
            ### CONTENT REQUIREMENTS:
            - Each slide MUST have substantial content (not just bullet points)
            - Include explanatory paragraphs, not just lists
            - Code examples must be COMPLETE and properly formatted with multiple lines
            - Math equations should be properly formatted with $inline$ or $$block$$ LaTeX
            - Use headers (##, ###) to organize content within slides
            
            ### MARKDOWN FORMAT:
            - Headers: ## for main sections, ### for subsections (not # since slide title is separate)
            - Bullet lists: Use - for items
            - Numbered lists: Use 1. 2. 3.
            - Math: Use $x^2$ for inline and $$\\sum_{i=1}^{n} x_i$$ for block math
            - Code blocks: ALWAYS use triple backticks with language identifier
              \`\`\`python
              def function_name():
                  # Multiple lines
                  return value
              \`\`\`
            - Callouts: :::info, :::tip, :::warning followed by content and :::
            
            ### EXAMPLE OUTPUT:
            [
                {
                    "type": "theory",
                    "title": "Understanding Vectors in Machine Learning",
                    "content": "## What is a Vector?\\n\\nA **vector** is a fundamental mathematical object used extensively in machine learning and data science. It represents a quantity with both magnitude and direction.\\n\\n### Mathematical Definition\\n\\nIn an $n$-dimensional space, a vector $\\\\mathbf{v}$ is defined as:\\n\\n$$\\\\mathbf{v} = \\\\begin{pmatrix} v_1 \\\\\\\\ v_2 \\\\\\\\ \\\\vdots \\\\\\\\ v_n \\\\end{pmatrix}$$\\n\\n### Key Properties\\n\\n- **Dimension**: The number of elements in the vector\\n- **Magnitude**: $||\\\\mathbf{v}|| = \\\\sqrt{\\\\sum_{i=1}^{n} v_i^2}$\\n- **Direction**: Determined by the ratio of components\\n\\n:::info\\nVectors are the building blocks for representing data points in ML. Each feature becomes a dimension in the vector space.\\n:::"
                },
                {
                    "type": "example", 
                    "title": "Vector Operations in Python",
                    "content": "## Implementing Vector Operations\\n\\nLet's implement basic vector operations using NumPy:\\n\\n\`\`\`python\\nimport numpy as np\\n\\n# Define two vectors\\nv1 = np.array([1, 2, 3])\\nv2 = np.array([4, 5, 6])\\n\\n# Vector addition\\nsum_v = v1 + v2\\nprint(f\\"Vector Addition: {sum_v}\\")  # Output: [5 7 9]\\n\\n# Scalar multiplication\\nscaled = 2 * v1\\nprint(f\\"Scalar Multiplication: {scaled}\\")  # Output: [2 4 6]\\n\\n# Dot product\\ndot_product = np.dot(v1, v2)\\nprint(f\\"Dot Product: {dot_product}\\")  # Output: 32\\n\\n# Vector magnitude\\nmagnitude = np.linalg.norm(v1)\\nprint(f\\"Magnitude: {magnitude:.2f}\\")  # Output: 3.74\\n\`\`\`\\n\\n:::tip\\nAlways use NumPy for vector operations in Python - it's optimized for numerical computations and much faster than pure Python loops.\\n:::"
                }
            ]
            
            Output ONLY the JSON array. NO comments, NO explanations. Pure JSON only.`),
            new MessagesPlaceholder("messages")
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({ messages: state.messages });

        let slidesData: { type: SlideType; title: string; content: string }[] = [];
        try {
            const content = (response as any).content;
            // Use repairJsonWithLatex for robust JSON parsing with LaTeX content
            slidesData = repairJsonWithLatex(content);
            // Ensure it's an array
            if (!Array.isArray(slidesData)) {
                throw new Error("Parsed result is not an array");
            }
        } catch (e) {
            console.error("Failed to parse slides JSON", e);
            // Fallback to a single theory slide
            slidesData = [{
                type: "theory" as SlideType,
                title: section.title,
                content: `## ${section.title}\n\n${section.description}\n\nContent for this section is being generated...`
            }];
        }

        // Convert to SlideContent with page numbers
        const newSlides: SlideContent[] = slidesData.map((slide, idx) => ({
            pageNumber: startSlideNum + idx,
            type: slide.type,
            title: slide.title,
            content: slide.content,
        }));

        // Also generate legacy markdown for backwards compatibility
        const sectionMarkdown = newSlides.map(slide => 
            `## ${slide.title}\n\n${slide.content}`
        ).join("\n\n---\n\n");

        return {
            slides: newSlides,
            sections_content: [sectionMarkdown]
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
        const slides = state.slides || [];

        const response: AgentResponse = {
            id: state.current_subtopic_id,
            subtopicId: state.current_subtopic_id,
            title: subtopicData.TopicName,
            createdAt: new Date().toISOString(),
            markdown: fullMarkdown,
            slides: slides,
            totalSlides: slides.length,
        };
        return { final_json: response };
    }

    private async saveContent(state: typeof ContentAgentState.State) {
        const doc = state.final_json as AgentResponse;
        
        // Return the content data instead of saving to filesystem
        // The Convex action will handle saving to the database
        console.log(`Content generated for subtopic: ${doc.id}`);
        
        return {
            // Return the content data for the caller to save
            content_result: doc
        };
    }

}
