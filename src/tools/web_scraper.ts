import axios from "axios";
import { load } from "cheerio";

export interface ScrapedContent {
    title: string;
    url: string;
    content: string;
    text: string; // Cleaned text without HTML
    metadata?: {
        author?: string;
        publishedDate?: string;
        description?: string;
        keywords?: string[];
    };
}

export class WebScraperTool {
    private maxContentLength: number;

    constructor(maxContentLength: number = 50000) {
        this.maxContentLength = maxContentLength;
    }

    /**
     * Scrape content from a single URL
     */
    async scrapeUrl(url: string): Promise<ScrapedContent> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                timeout: 10000,
                maxRedirects: 5,
            });

            const $ = load(response.data);
            
            // Remove script and style elements
            $('script, style, nav, footer, header, aside, .advertisement, .ads').remove();

            // Extract title
            const title = $('title').text().trim() || 
                         $('h1').first().text().trim() || 
                         $('meta[property="og:title"]').attr('content') || 
                         url;

            // Extract main content
            // Try common article/content selectors
            let content = '';
            const contentSelectors = [
                'article',
                '[role="main"]',
                '.content',
                '.post-content',
                '.entry-content',
                'main',
                '#content',
                '.article-content',
            ];

            for (const selector of contentSelectors) {
                const element = $(selector).first();
                if (element.length > 0) {
                    content = element.html() || '';
                    break;
                }
            }

            // Fallback to body if no specific content area found
            if (!content) {
                content = $('body').html() || '';
            }

            // Extract clean text
            const text = $('body').text()
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            // Extract metadata
            const metadata = {
                author: $('meta[name="author"]').attr('content') || 
                       $('[rel="author"]').text().trim() || 
                       $('.author').first().text().trim() || 
                       undefined,
                publishedDate: $('meta[property="article:published_time"]').attr('content') ||
                             $('time[datetime]').attr('datetime') ||
                             $('meta[name="date"]').attr('content') ||
                             undefined,
                description: $('meta[name="description"]').attr('content') ||
                           $('meta[property="og:description"]').attr('content') ||
                           undefined,
                keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || undefined,
            };

            // Limit content length
            const truncatedText = text.substring(0, this.maxContentLength);
            const truncatedContent = content.substring(0, this.maxContentLength);

            return {
                title,
                url,
                content: truncatedContent,
                text: truncatedText,
                metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            };
        } catch (error: any) {
            console.error(`Failed to scrape ${url}:`, error.message);
            throw new Error(`Web scraping failed for ${url}: ${error.message}`);
        }
    }

    /**
     * Scrape multiple URLs in parallel
     */
    async scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
        const results = await Promise.allSettled(
            urls.map(url => this.scrapeUrl(url))
        );

        return results
            .filter((result): result is PromiseFulfilledResult<ScrapedContent> => 
                result.status === 'fulfilled'
            )
            .map(result => result.value);
    }

    /**
     * Extract text content from HTML string
     */
    extractText(html: string): string {
        const $ = load(html);
        $('script, style').remove();
        return $('body').text()
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }
}

