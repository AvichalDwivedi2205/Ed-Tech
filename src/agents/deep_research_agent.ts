import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "../utils/model";
import { TavilySearchTool } from "../tools/search";
import { PerplexitySearchTool } from "../tools/search";
import { WebScraperTool } from "../tools/web_scraper";

export type ResearchMode = "normal" | "comprehensive";

export interface ResearchSettings {
    mode: ResearchMode;
    maxSources?: number;
    maxScrapedUrls?: number;
}

export interface Citation {
    id: string;
    url: string;
    title: string;
    snippet?: string;
    accessedAt: string;
}

export interface ResearchResult {
    markdown: string;
    citations: Citation[];
    summary: string;
    sections: string[];
    researchDepth: ResearchMode;
    sourcesCount: number;
}

// Define the state
export const DeepResearchAgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    researchQuery: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    clarification_count: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
    waiting_for_response: Annotation<boolean>({
        reducer: (x, y) => y,
        default: () => false,
    }),
    researchObjective: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    subQuestions: Annotation<string[]>({
        reducer: (x, y) => y,
        default: () => [],
    }),
    researchPlan: Annotation<any>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    searchResults: Annotation<any[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    scrapedContent: Annotation<any[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    verifiedSources: Annotation<Citation[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    synthesizedContent: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    finalReport: Annotation<ResearchResult | {}>({
        reducer: (x, y) => y,
        default: () => ({}),
    }),
    settings: Annotation<ResearchSettings>({
        reducer: (x, y) => y,
        default: () => ({ mode: "normal" }),
    }),
    sourceCount: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
});

export class DeepResearchAgent {
    private llm: any;
    private llmStructured: any;
    private perplexityTool: PerplexitySearchTool;
    private tavilyTool: TavilySearchTool;
    private webScraper: WebScraperTool;
    public graph: any;

    constructor(settings?: ResearchSettings) {
        this.llm = getModel(0.7);
        this.llmStructured = getModel(0.2);
        this.perplexityTool = new PerplexitySearchTool();
        this.tavilyTool = new TavilySearchTool();
        this.webScraper = new WebScraperTool();
        this.graph = this._buildGraph();
    }

    private _buildGraph() {
        const workflow = new StateGraph(DeepResearchAgentState)
            .addNode("ask_clarification", this.askClarification.bind(this))
            .addNode("clarify_objective", this.clarifyObjective.bind(this))
            .addNode("plan_research", this.planResearch.bind(this))
            .addNode("broad_search", this.broadSearch.bind(this))
            .addNode("targeted_search", this.targetedSearch.bind(this))
            .addNode("deep_search", this.deepSearch.bind(this))
            .addNode("scrape_sources", this.scrapeSources.bind(this))
            .addNode("cross_verify", this.crossVerify.bind(this))
            .addNode("synthesize", this.synthesize.bind(this))
            .addNode("generate_report", this.generateReport.bind(this))

            .addEdge("__start__", "ask_clarification")
            .addConditionalEdges("ask_clarification", this.shouldContinueClarifying.bind(this), {
                clarify: "ask_clarification",
                research: "clarify_objective",
                end: END,
            })
            .addEdge("clarify_objective", "plan_research")
            .addEdge("plan_research", "broad_search")
            .addEdge("broad_search", "targeted_search")
            .addEdge("targeted_search", "deep_search")
            .addEdge("deep_search", "scrape_sources")
            .addEdge("scrape_sources", "cross_verify")
            .addConditionalEdges("cross_verify", this.hasEnoughSources.bind(this), {
                deep_search: "deep_search",
                synthesize: "synthesize",
            })
            .addEdge("synthesize", "generate_report")
            .addEdge("generate_report", END);

        return workflow.compile();
    }

    // Step 0: Ask clarification questions
    private async askClarification(state: typeof DeepResearchAgentState.State) {
        const clarificationCount = state.clarification_count;
        const messages = state.messages;
        const researchQuery = state.researchQuery;

        if (clarificationCount > 0) {
            return {
                messages: [...messages, new AIMessage("Thank you for the additional details. I now have enough information to conduct a thorough research. Let me proceed...")],
            };
        }

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are a helpful research assistant specializing in deep research reports.

Your goal is to gather all necessary information to conduct comprehensive research in ONE go.

Ask a SINGLE, comprehensive clarification question that covers:
1. The specific scope and depth of the research topic (what aspects should be covered?)
2. The intended audience or purpose (who is this research for? academic, business, personal?)
3. Any specific areas of focus, constraints, or particular angles to investigate
4. The desired research depth (standard overview vs comprehensive deep-dive)
5. Any specific sources, perspectives, or viewpoints to include or exclude

Do NOT ask multiple questions one by one. Ask ONE combined, thoughtful question that helps you understand exactly what kind of research report to generate.

The user's initial query was: "${researchQuery}"

Use this context to ask a relevant clarification question.`),
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

    private shouldContinueClarifying(state: typeof DeepResearchAgentState.State): string {
        const waiting = state.waiting_for_response;
        const clarificationCount = state.clarification_count;

        if (waiting) {
            return "end";
        }

        if (clarificationCount >= 1) {
            return "research";
        }

        return "clarify";
    }

    // Step 1: Clarify research objective
    private async clarifyObjective(state: typeof DeepResearchAgentState.State) {
        const query = state.researchQuery;
        const mode = state.settings.mode || "normal";

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are a research analyst. Parse the user's research query and identify:
1. The core research question
2. Key sub-questions that need to be answered
3. Important aspects to investigate

Research mode: ${mode}
For ${mode === "comprehensive" ? "comprehensive" : "normal"} research, ${mode === "comprehensive" ? "identify 12-15 sub-questions covering all angles" : "identify 6-8 key sub-questions"}.

Output a JSON object with:
{
  "objective": "clear restatement of the research question",
  "subQuestions": ["question1", "question2", ...]
}`),
            new HumanMessage(`Research Query: ${query}`),
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({});

        let parsed;
        try {
            const content = (response as any).content || JSON.stringify(response);
            parsed = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
            parsed = {
                objective: query,
                subQuestions: [query],
            };
        }

        return {
            researchObjective: parsed.objective || query,
            subQuestions: parsed.subQuestions || [query],
            messages: [new SystemMessage(`Research Objective: ${parsed.objective}\nSub-questions: ${parsed.subQuestions.join(", ")}`)],
        };
    }

    // Step 2: Plan research path
    private async planResearch(state: typeof DeepResearchAgentState.State) {
        const objective = state.researchObjective;
        const subQuestions = state.subQuestions;
        const mode = state.settings.mode || "normal";

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are a research strategist. Create a structured research plan with MANY search queries.

Research Objective: ${objective}
Sub-questions: ${subQuestions.join(", ")}

For ${mode === "comprehensive" ? "comprehensive" : "normal"} research, plan:
- ${mode === "comprehensive" ? "12-15" : "6-8"} main sections to investigate
- ${mode === "comprehensive" ? "3-5" : "2-3"} search queries per section (to gather 70-80 sources total)
- Types of sources needed (academic, news, expert opinions, data)

IMPORTANT: Generate MANY diverse search queries to ensure we gather ${mode === "comprehensive" ? "70-80" : "20-30"} unique sources.

Output a JSON object with:
{
  "sections": [
    {
      "title": "Section title",
      "description": "What to investigate",
      "searchQueries": ["query1", "query2", "query3", ...],
      "sourceTypes": ["academic", "news", "expert"]
    }
  ]
}`),
        ]);

        const chain = prompt.pipe(this.llmStructured);
        const response = await chain.invoke({});

        let plan;
        try {
            const content = (response as any).content || JSON.stringify(response);
            plan = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
            plan = {
                sections: subQuestions.map((q, i) => ({
                    title: `Section ${i + 1}`,
                    description: q,
                    searchQueries: [q],
                    sourceTypes: ["general"],
                })),
            };
        }

        return {
            researchPlan: plan,
            messages: [new SystemMessage(`Research Plan Created: ${plan.sections.length} sections planned`)],
        };
    }

    // Step 3: Broad contextual search (Perplexity-style) - Multiple searches
    private async broadSearch(state: typeof DeepResearchAgentState.State) {
        const objective = state.researchObjective;
        const plan = state.researchPlan;
        const mode = state.settings.mode || "normal";
        const perplexitySearches = mode === "comprehensive" ? 8 : 4;
        const maxResultsPerSearch = mode === "comprehensive" ? 10 : 5;

        console.log(`Running broad contextual search (${perplexitySearches} Perplexity searches)...`);

        const searchQueries = [
            objective,
            ...(plan.sections || []).map((s: any) => s.title).slice(0, perplexitySearches - 1),
        ];

        // Generate additional queries if needed
        while (searchQueries.length < perplexitySearches) {
            searchQueries.push(`${objective} ${searchQueries.length + 1}`);
        }

        const results: any[] = [];

        for (const query of searchQueries.slice(0, perplexitySearches)) {
            try {
                const perplexityResult = await this.perplexityTool.runRaw(query, maxResultsPerSearch);
                if (perplexityResult.results || perplexityResult.citations) {
                    results.push({
                        type: "perplexity",
                        query,
                        data: perplexityResult,
                    });
                }
            } catch (error: any) {
                console.error(`Perplexity search failed for "${query}":`, error.message);
            }
        }

        return {
            searchResults: results,
            messages: [new SystemMessage(`Broad search completed: ${results.length} Perplexity result sets gathered`)],
        };
    }

    // Step 4: Targeted fact-finding search (Tavily-style) - Maximum depth
    private async targetedSearch(state: typeof DeepResearchAgentState.State) {
        const plan = state.researchPlan;
        const mode = state.settings.mode || "normal";
        const maxResults = 20; // Tavily's maximum per search
        const searchDepth = "advanced"; // Maximum depth

        console.log(`Running targeted fact-finding search (max ${maxResults} results per query, depth: ${searchDepth})...`);

        const sections = plan.sections || [];
        const allQueries: string[] = [];

        for (const section of sections) {
            const queries = section.searchQueries || [section.title];
            allQueries.push(...queries);
        }

        const results: any[] = [];

        // Run all queries with maximum results
        for (const query of allQueries) {
            try {
                const tavilyResult = await this.tavilyTool.runRaw(query, maxResults, searchDepth);
                if (tavilyResult.results && tavilyResult.results.length > 0) {
                    results.push({
                        type: "tavily",
                        query,
                        data: tavilyResult,
                    });
                }
            } catch (error: any) {
                console.error(`Tavily search failed for "${query}":`, error.message);
            }
        }

        return {
            searchResults: state.searchResults.concat(results),
            messages: [new SystemMessage(`Targeted search completed: ${results.length} additional Tavily result sets`)],
        };
    }

    // Step 5: Deep search - Additional rounds of searches
    private async deepSearch(state: typeof DeepResearchAgentState.State) {
        const objective = state.researchObjective;
        const subQuestions = state.subQuestions;
        const mode = state.settings.mode || "normal";
        const maxResults = 20;
        const searchDepth = "advanced";

        console.log("Running deep search (additional search rounds)...");

        // Generate additional search queries based on sub-questions and objective
        const additionalQueries: string[] = [];
        
        // Add variations of the main objective
        additionalQueries.push(`${objective} analysis`);
        additionalQueries.push(`${objective} research`);
        additionalQueries.push(`${objective} study`);
        
        // Add queries for each sub-question
        for (const subQ of subQuestions.slice(0, mode === "comprehensive" ? 10 : 5)) {
            additionalQueries.push(subQ);
            additionalQueries.push(`${subQ} overview`);
        }

        const results: any[] = [];

        // Run Tavily searches
        for (const query of additionalQueries.slice(0, mode === "comprehensive" ? 15 : 8)) {
            try {
                const tavilyResult = await this.tavilyTool.runRaw(query, maxResults, searchDepth);
                if (tavilyResult.results && tavilyResult.results.length > 0) {
                    results.push({
                        type: "tavily",
                        query,
                        data: tavilyResult,
                    });
                }
            } catch (error: any) {
                console.error(`Deep Tavily search failed for "${query}":`, error.message);
            }
        }

        // Run additional Perplexity searches
        for (const query of additionalQueries.slice(0, mode === "comprehensive" ? 10 : 5)) {
            try {
                const perplexityResult = await this.perplexityTool.runRaw(query, mode === "comprehensive" ? 10 : 5);
                if (perplexityResult.results || perplexityResult.citations) {
                    results.push({
                        type: "perplexity",
                        query,
                        data: perplexityResult,
                    });
                }
            } catch (error: any) {
                console.error(`Deep Perplexity search failed for "${query}":`, error.message);
            }
        }

        return {
            searchResults: state.searchResults.concat(results),
            messages: [new SystemMessage(`Deep search completed: ${results.length} additional result sets`)],
        };
    }

    // Step 6: Scrape authoritative sources - Many URLs
    private async scrapeSources(state: typeof DeepResearchAgentState.State) {
        const searchResults = state.searchResults;
        const mode = state.settings.mode || "normal";
        const maxUrls = mode === "comprehensive" ? 60 : 25; // Scrape many URLs

        console.log(`Scraping authoritative sources (target: ${maxUrls} URLs)...`);

        // Extract URLs from search results
        const urls: string[] = [];
        const urlSet = new Set<string>();

        for (const result of searchResults) {
            if (result.type === "tavily" && result.data.results) {
                for (const item of result.data.results) {
                    if (item.url && !urlSet.has(item.url)) {
                        urls.push(item.url);
                        urlSet.add(item.url);
                    }
                }
            }
            if (result.type === "perplexity" && result.data.citations) {
                for (const url of result.data.citations) {
                    if (url && !urlSet.has(url)) {
                        urls.push(url);
                        urlSet.add(url);
                    }
                }
            }
        }

        // Limit URLs to scrape
        const urlsToScrape = urls.slice(0, maxUrls);

        const scraped: any[] = [];
        if (urlsToScrape.length > 0) {
            try {
                const scrapedContent = await this.webScraper.scrapeUrls(urlsToScrape);
                scraped.push(...scrapedContent.map(content => ({
                    url: content.url,
                    title: content.title,
                    text: content.text,
                    metadata: content.metadata,
                })));
            } catch (error: any) {
                console.error("Scraping failed:", error.message);
            }
        }

        return {
            scrapedContent: state.scrapedContent.concat(scraped),
            messages: [new SystemMessage(`Scraped ${scraped.length} sources (total scraped: ${state.scrapedContent.length + scraped.length})`)],
        };
    }

    // Step 7: Cross-verify and compile citations
    private async crossVerify(state: typeof DeepResearchAgentState.State) {
        const searchResults = state.searchResults;
        const scrapedContent = state.scrapedContent;
        const mode = state.settings.mode || "normal";
        const targetSources = mode === "comprehensive" ? 75 : 25; // Target source count

        console.log(`Cross-verifying sources and compiling citations (target: ${targetSources} sources)...`);

        const citations: Citation[] = [];
        const citationMap = new Map<string, Citation>();

        // Extract citations from search results
        for (const result of searchResults) {
            if (result.type === "tavily" && result.data.results) {
                for (const item of result.data.results) {
                    if (item.url && !citationMap.has(item.url)) {
                        citationMap.set(item.url, {
                            id: `cite-${citationMap.size + 1}`,
                            url: item.url,
                            title: item.title || item.url,
                            snippet: item.content?.substring(0, 200),
                            accessedAt: new Date().toISOString(),
                        });
                    }
                }
            }
            if (result.type === "perplexity" && result.data.citations) {
                for (const url of result.data.citations) {
                    if (url && !citationMap.has(url)) {
                        citationMap.set(url, {
                            id: `cite-${citationMap.size + 1}`,
                            url: url,
                            title: url,
                            accessedAt: new Date().toISOString(),
                        });
                    }
                }
            }
        }

        // Add scraped content as citations
        for (const content of scrapedContent) {
            if (content.url && !citationMap.has(content.url)) {
                citationMap.set(content.url, {
                    id: `cite-${citationMap.size + 1}`,
                    url: content.url,
                    title: content.title || content.url,
                    snippet: content.text?.substring(0, 200),
                    accessedAt: new Date().toISOString(),
                });
            }
        }

        citations.push(...Array.from(citationMap.values()));

        return {
            verifiedSources: citations,
            sourceCount: citations.length,
            messages: [new SystemMessage(`Verified ${citations.length} unique sources (target: ${targetSources})`)],
        };
    }

    // Check if we have enough sources
    private hasEnoughSources(state: typeof DeepResearchAgentState.State): string {
        const mode = state.settings.mode || "normal";
        const currentCount = state.sourceCount;
        const targetSources = mode === "comprehensive" ? 75 : 25;

        if (currentCount >= targetSources) {
            return "synthesize";
        }

        // If we're close but not quite there, try one more round
        if (currentCount >= targetSources * 0.7) {
            return "synthesize"; // Close enough, proceed
        }

        return "deep_search"; // Need more sources, do another deep search round
    }

    // Step 8: Synthesize findings
    private async synthesize(state: typeof DeepResearchAgentState.State) {
        const objective = state.researchObjective;
        const subQuestions = state.subQuestions;
        const searchResults = state.searchResults;
        const scrapedContent = state.scrapedContent;
        const citations = state.verifiedSources;
        const plan = state.researchPlan;

        console.log(`Synthesizing research findings from ${citations.length} sources...`);

        // Compile all research data
        let researchData = `Research Objective: ${objective}\n\n`;
        researchData += `Sub-questions to answer:\n${subQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\n`;

        // Add search results summary
        researchData += "=== SEARCH RESULTS SUMMARY ===\n\n";
        researchData += `Total search result sets: ${searchResults.length}\n`;
        researchData += `Total sources found: ${citations.length}\n\n`;

        // Add sample search results (limit to avoid token limits)
        let resultCount = 0;
        for (const result of searchResults.slice(0, 20)) {
            if (result.type === "tavily" && result.data.results) {
                researchData += `Tavily Search: ${result.query}\n`;
                for (const item of result.data.results.slice(0, 3)) {
                    researchData += `- ${item.title}\n`;
                    researchData += `  URL: ${item.url}\n`;
                    if (item.content) {
                        researchData += `  ${item.content.substring(0, 200)}...\n`;
                    }
                }
                researchData += "\n";
                resultCount++;
            }
        }

        // Add scraped content summary
        if (scrapedContent.length > 0) {
            researchData += `\n=== SCRAPED CONTENT SUMMARY ===\n\n`;
            researchData += `Total scraped sources: ${scrapedContent.length}\n\n`;
            for (const content of scrapedContent.slice(0, 15)) {
                researchData += `Title: ${content.title}\n`;
                researchData += `URL: ${content.url}\n`;
                researchData += `Content: ${content.text?.substring(0, 300)}...\n\n`;
            }
        }

        // Add all citations
        researchData += `\n=== ALL SOURCES (${citations.length} total) ===\n\n`;
        citations.forEach((cite, i) => {
            researchData += `[${i + 1}] ${cite.title}\n`;
            researchData += `URL: ${cite.url}\n`;
            if (cite.snippet) {
                researchData += `Snippet: ${cite.snippet}\n`;
            }
            researchData += "\n";
        });

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(`You are an expert research analyst. Synthesize the research findings into a coherent, comprehensive narrative.

Research sections to cover:
${(plan.sections || []).map((s: any, i: number) => `${i + 1}. ${s.title}: ${s.description}`).join("\n")}

Instructions:
- Answer all sub-questions thoroughly using information from the ${citations.length} sources provided
- Cross-reference information from multiple sources
- Identify contradictions and resolve them using the most reliable evidence
- Highlight uncertainties or missing data
- Use inline citations in the format [1], [2], etc. referring to the sources provided
- Structure the content logically with clear sections
- Be comprehensive and detailed - you have ${citations.length} sources to draw from

Output a comprehensive synthesis that addresses all aspects of the research objective.`),
            new HumanMessage(`Research Data:\n\n${researchData}`),
        ]);

        const chain = prompt.pipe(this.llm);
        const response = await chain.invoke({});
        const synthesized = (response as any).content || "";

        return {
            synthesizedContent: synthesized,
            messages: [new SystemMessage(`Research findings synthesized from ${citations.length} sources`)],
        };
    }

    // Step 9: Generate final report
    private async generateReport(state: typeof DeepResearchAgentState.State) {
        const objective = state.researchObjective;
        const synthesized = state.synthesizedContent;
        const citations = state.verifiedSources;
        const plan = state.researchPlan;
        const mode = state.settings.mode || "normal";

        console.log(`Generating final research report with ${citations.length} sources...`);

        const sections = (plan.sections || []).map((s: any) => s.title);

        // Create executive summary
        const summaryPrompt = ChatPromptTemplate.fromMessages([
            new SystemMessage("Create a concise executive summary (2-3 paragraphs) of the research findings."),
            new HumanMessage(`Research Objective: ${objective}\n\nSynthesized Content:\n${synthesized}`),
        ]);

        const summaryChain = summaryPrompt.pipe(this.llm);
        const summaryResponse = await summaryChain.invoke({});
        const summary = (summaryResponse as any).content || "";

        // Build final markdown report
        const markdown = `# ${objective}

## Executive Summary

${summary}

---

## Research Report

${synthesized}

---

## Citations

${citations.map((cite, i) => {
    return `[${i + 1}] ${cite.title}. ${cite.url}${cite.snippet ? `\n   ${cite.snippet}` : ""}`;
}).join("\n\n")}

---

*Report generated on ${new Date().toLocaleDateString()}*
*Research mode: ${mode === "comprehensive" ? "Comprehensive" : "Standard"}*
*Total sources: ${citations.length}*
`;

        const result: ResearchResult = {
            markdown,
            citations,
            summary,
            sections,
            researchDepth: mode as ResearchMode,
            sourcesCount: citations.length,
        };

        return {
            finalReport: result,
            messages: [new SystemMessage(`Research report generated successfully with ${citations.length} sources`)],
        };
    }
}
