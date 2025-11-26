import { ConvexHttpClient } from "convex/browser";
import { GeminiEmbeddingService } from "../tools/embedding";

export interface RAGChunk {
  id: string;
  docId: string;
  text: string;
  pageStart: number;
  pageEnd: number;
  similarity: number;
  metadata?: any;
}

export interface RAGContext {
  chunks: RAGChunk[];
  formattedContext: string;
}

export class RAGService {
  private convexClient: ConvexHttpClient;
  private embeddingService: GeminiEmbeddingService;
  private workspaceId: string;

  constructor(convexUrl: string, workspaceId: string) {
    this.convexClient = new ConvexHttpClient(convexUrl);
    this.embeddingService = new GeminiEmbeddingService();
    this.workspaceId = workspaceId;
  }

  /**
   * Retrieve relevant chunks for a query
   */
  async retrieve(
    prompt: string,
    ragNamespace: string,
    k: number = 20
  ): Promise<RAGContext> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embedQuery(prompt);

    // Search Convex for relevant chunks
    // Note: api import will be available after Convex codegen runs
    // For now, we'll use a dynamic import approach
    const { api } = await import("../../convex/_generated/api");
    const results = await this.convexClient.query(api.rag.searchChunks, {
      queryEmbedding,
      ragNamespace,
      workspaceId: this.workspaceId,
      k,
    });

    // Format chunks with metadata
    const chunks: RAGChunk[] = results.map((result: any) => ({
      id: result._id,
      docId: result.docId,
      text: result.text,
      pageStart: result.pageStart,
      pageEnd: result.pageEnd,
      similarity: result.similarity,
      metadata: result.metadata,
    }));

    // Get document titles for context
    const docIds = new Set(chunks.map((c) => c.docId));
    const docTitles: Record<string, string> = {};
    
    // Fetch document titles (we'll need to add a query for this or include in chunk metadata)
    // For now, we'll format without titles and can enhance later

    // Format context string
    const formattedContext = this.formatContext(chunks);

    return {
      chunks,
      formattedContext,
    };
  }

  /**
   * Format chunks into a readable context string
   */
  private formatContext(chunks: RAGChunk[]): string {
    // Select top 6-8 chunks by similarity, avoiding duplicates
    const selectedChunks = this.selectTopChunks(chunks, 8);

    let context = "=== RAG CONTEXT ===\n\n";

    selectedChunks.forEach((chunk, index) => {
      context += `[${index + 1}] `;
      if (chunk.pageStart === chunk.pageEnd) {
        context += `Page ${chunk.pageStart}`;
      } else {
        context += `Pages ${chunk.pageStart}-${chunk.pageEnd}`;
      }
      context += ` (Similarity: ${chunk.similarity.toFixed(3)})\n`;
      context += `${chunk.text}\n\n`;
    });

    return context;
  }

  /**
   * Select top N chunks, avoiding near-duplicates
   */
  private selectTopChunks(chunks: RAGChunk[], maxChunks: number): RAGChunk[] {
    // Sort by similarity descending
    const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);

    const selected: RAGChunk[] = [];
    const seenTexts = new Set<string>();

    for (const chunk of sorted) {
      if (selected.length >= maxChunks) {
        break;
      }

      // Simple deduplication: check if text is too similar to already selected chunks
      const normalizedText = chunk.text.toLowerCase().trim().substring(0, 100);
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        selected.push(chunk);
      }
    }

    return selected;
  }

  /**
   * Get document by path
   */
  async getDocumentByPath(sourcePath: string) {
    const { api } = await import("../../convex/_generated/api");
    return await this.convexClient.query(api.rag.getDocumentByPath, {
      sourcePath,
      workspaceId: this.workspaceId,
    });
  }

  /**
   * Insert document
   */
  async insertDocument(docData: {
    ragNamespace: string;
    title: string;
    sourcePath: string;
    pageCount: number;
    status: "pending" | "indexed" | "skipped_page_limit" | "failed";
    hash: string;
  }) {
    const { api } = await import("../../convex/_generated/api");
    return await this.convexClient.mutation(api.rag.insertDocument, {
      workspaceId: this.workspaceId,
      ...docData,
    });
  }

  /**
   * Insert chunks
   */
  async insertChunks(chunksData: Array<{
    docId: string; // Will be converted to Id<"documents"> by Convex
    ragNamespace: string;
    chunkIndex: number;
    pageStart: number;
    pageEnd: number;
    text: string;
    embedding: number[];
    metadata?: any;
  }>) {
    const { api } = await import("../../convex/_generated/api");
    
    return await this.convexClient.mutation(api.rag.insertChunks, {
      chunks: chunksData.map((chunk) => ({
        ...chunk,
        docId: chunk.docId as any, // Convex will validate the ID type
        workspaceId: this.workspaceId,
        metadata: chunk.metadata || {},
      })),
    });
  }
}

