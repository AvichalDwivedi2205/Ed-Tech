import { TavilySearchTool } from "./search";

export interface AcademicResource {
    title: string;
    url: string;
    snippet?: string;
    content?: string;      // full or partial cleaned text
    sourceDomain?: string;
    publishedAt?: string;  // ISO date if known
}

export class AcademicRetrievalTool {
    private tavilyTool: TavilySearchTool;
    private trustedDomains: string[];

    constructor(
        trustedDomains: string[] = [
            "ocw.mit.edu",
            "online.stanford.edu",
            "arxiv.org",
            "scholar.google.com",
            "www.coursera.org",
            "www.edx.org",
            "nptel.ac.in"
        ]
    ) {
        this.tavilyTool = new TavilySearchTool();
        this.trustedDomains = trustedDomains;
    }

    private buildDomainQuery(): string {
        return this.trustedDomains.map(d => `site:${d}`).join(" OR ");
    }

    async retrieve(topic: string, maxResults: number = 5): Promise<AcademicResource[]> {
        console.log(`Running Academic Retrieval for: ${topic}`);

        const siteQuery = this.buildDomainQuery();
        const fullQuery = `${topic} (${siteQuery})`;

        try {
            // Use runRaw to get the full JSON response
            const rawData = await this.tavilyTool.runRaw(fullQuery, maxResults);
            const results = rawData.results || [];

            const resources: AcademicResource[] = results.map((r: any) => ({
                title: r.title,
                url: r.url,
                snippet: r.content, // Tavily returns 'content' which is usually a snippet or extracted text
                content: r.raw_content || r.content, // Use raw_content if available, else content
                sourceDomain: new URL(r.url).hostname,
                publishedAt: r.published_date ?? undefined
            }));

            return resources;
        } catch (error: any) {
            console.error("Academic retrieval failed:", error);
            return [];
        }
    }
}
