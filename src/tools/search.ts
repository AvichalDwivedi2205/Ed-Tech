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

    async run(query: string, maxResults: number = 8): Promise<string> {
        try {
            const response = await axios.post(
                "https://api.perplexity.ai/chat/completions",
                {
                    model: "llama-3.1-sonar-small-128k-online",
                    messages: [
                        {
                            role: "system",
                            content: "Search the web and provide verified citations.",
                        },
                        {
                            role: "user",
                            content: query,
                        },
                    ],
                    max_tokens: 2048,
                    temperature: 0.2,
                    return_citations: true,
                    return_images: false,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const content = response.data.choices[0].message.content;
            const citations = response.data.citations || [];

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

    async run(query: string, maxResults: number = 5): Promise<string> {
        try {
            const response = await axios.post(
                "https://api.tavily.com/search",
                {
                    api_key: this.apiKey,
                    query: query,
                    search_depth: "advanced",
                    include_answer: true,
                    max_results: maxResults,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const results = response.data.results || [];
            const answer = response.data.answer || "";

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
