import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export class PerplexitySearchTool {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.PERPLEXITY_API_KEY || "";
        if (!this.apiKey) {
            throw new Error("PERPLEXITY_API_KEY is not set in .env");
        }
    }

    async runRaw(query: string, maxResults: number = 5): Promise<any> {
        try {
            // Use the new Search API endpoint
            // Docs: https://docs.perplexity.ai/guides/search-quickstart
            const response = await axios.post(
                "https://api.perplexity.ai/search",
                {
                    query: query,
                    max_results: maxResults,
                    // max_tokens_per_page: 1024 // Optional, controls snippet length
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error(`Perplexity search failed: ${error.message}`);
            // Return empty structure on error
            return { results: [], citations: [] };
        }
    }

    async run(query: string, maxResults: number = 8): Promise<string> {
        try {
            const data = await this.runRaw(query);
            const content = data.choices[0].message.content;
            const citations = data.citations || [];

            let formattedOutput = `=== Search Results for: ${query} ===\n\n`;
            formattedOutput += content + "\n\n";

            if (citations.length > 0) {
                formattedOutput += "=== VERIFIED CITATIONS ===\n";
                citations.forEach((url: string, index: number) => {
                    formattedOutput += `[${index + 1}] ${url}\n`;
                });
            }

            return formattedOutput;
        } catch (error: any) {
            throw new Error(`Perplexity search failed: ${error.message}`);
        }
    }
}

export class TavilySearchTool {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY || "";
        if (!this.apiKey) {
            throw new Error("TAVILY_API_KEY is not set in .env");
        }
    }

    async runRaw(query: string, maxResults: number = 5, searchDepth: "basic" | "advanced" = "advanced"): Promise<any> {
        try {
            const response = await axios.post(
                "https://api.tavily.com/search",
                {
                    api_key: this.apiKey,
                    query: query,
                    search_depth: searchDepth,
                    include_answer: true,
                    max_results: maxResults,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            throw new Error(`Tavily search failed: ${error.message}`);
        }
    }

    async run(query: string, maxResults: number = 5): Promise<string> {
        try {
            const data = await this.runRaw(query, maxResults);
            const results = data.results || [];
            const answer = data.answer || "";

            let formattedOutput = `=== Tavily Search Results for: ${query} ===\n\n`;
            if (answer) {
                formattedOutput += `Answer: ${answer}\n\n`;
            }

            formattedOutput += "=== SOURCES ===\n";
            results.forEach((result: any, index: number) => {
                formattedOutput += `[${index + 1}] ${result.title}\n`;
                formattedOutput += `URL: ${result.url}\n`;
                formattedOutput += `Content: ${result.content.substring(0, 300)}...\n\n`;
            });

            return formattedOutput;
        } catch (error: any) {
            throw new Error(`Tavily search failed: ${error.message}`);
        }
    }
}
