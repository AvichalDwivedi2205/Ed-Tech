"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { DocumentProcessor } from "../../src/tools/document_processor";
import { GeminiEmbeddingService } from "../../src/tools/embedding";
import { chunkText } from "../../src/utils/chunking";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import crypto from "crypto";

export const ingestFromStorage = action({
  args: {
    workspaceId: v.id("workspaces"),
    storageId: v.id("_storage"),
    ragNamespace: v.string(),
    title: v.string(),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    documentId: Id<"documents">;
    status: string;
    message?: string;
    chunksCount?: number;
    pageCount?: number;
  }> => {
    // Get file from Convex Storage
    const file = await ctx.storage.get(args.storageId);
    if (!file) {
      throw new Error("File not found in storage");
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file type from file name or content
    const fileName = args.title;
    const fileExt = fileName.includes(".") 
      ? fileName.substring(fileName.lastIndexOf("."))
      : ".pdf"; // Default to PDF

    // Compute hash
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check if already indexed
    if (!args.force) {
      const existingDocs: any[] = await ctx.runQuery(api.rag.getDocumentByStorageId, {
        storageId: args.storageId,
        workspaceId: args.workspaceId,
      });
      
      if (existingDocs && existingDocs.length > 0) {
        const existing: any = existingDocs[0];
        if (existing.hash === hash && existing.status === "indexed") {
          return {
            documentId: existing._id,
            status: "already_indexed",
            message: "Document already indexed",
          };
        }
      }
    }

    // Initialize processors
    const processor = new DocumentProcessor();
    const embeddingService = new GeminiEmbeddingService();

    // Count pages (using buffer-based method)
    let pageCount: number;
    try {
      pageCount = await processor.countPagesFromBuffer(buffer, fileExt);
    } catch (error: any) {
      throw new Error(`Failed to count pages: ${error.message}`);
    }

    // Check page limit
    if (pageCount > 500) {
      const docId: Id<"documents"> = await ctx.runMutation(api.rag.insertDocument, {
        workspaceId: args.workspaceId,
        ragNamespace: args.ragNamespace,
        title: fileName,
        sourcePath: undefined,
        storageId: args.storageId,
        pageCount,
        status: "skipped_page_limit",
        hash,
      });
      
      return {
        documentId: docId,
        status: "skipped_page_limit",
        message: `Document exceeds 500 page limit (${pageCount} pages)`,
      };
    }

    // Extract text (using buffer-based method)
    const extracted = await processor.extractTextFromBuffer(buffer, fileExt);

    // Chunk text
    const chunks = chunkText(extracted.pages, 600, 100);

    // Generate embeddings
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embeddingService.generateEmbeddings(chunkTexts);

    // Insert document
    const docId: Id<"documents"> = await ctx.runMutation(api.rag.insertDocument, {
      workspaceId: args.workspaceId,
      ragNamespace: args.ragNamespace,
      title: fileName,
      sourcePath: undefined,
      storageId: args.storageId,
      pageCount: extracted.pageCount,
      status: "pending",
      hash,
    });

    // Prepare chunks for insertion
    const chunksData = chunks.map((chunk, index) => ({
      docId: docId,
      workspaceId: args.workspaceId,
      ragNamespace: args.ragNamespace,
      chunkIndex: chunk.chunkIndex,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      text: chunk.text,
      embedding: embeddings[index],
      metadata: {
        tokenEstimate: chunk.tokenEstimate,
        requiresOcr: extracted.pages[chunk.pageStart - 1]?.requiresOcr || false,
      },
    }));

    // Insert chunks
    await ctx.runMutation(api.rag.insertChunks, {
      chunks: chunksData,
    });

    // Update document status to indexed
    await ctx.runMutation(api.rag.insertDocument, {
      workspaceId: args.workspaceId,
      ragNamespace: args.ragNamespace,
      title: fileName,
      sourcePath: undefined,
      storageId: args.storageId,
      pageCount: extracted.pageCount,
      status: "indexed",
      hash,
    });

    return {
      documentId: docId,
      status: "indexed",
      chunksCount: chunks.length,
      pageCount: extracted.pageCount,
    };
  },
});

