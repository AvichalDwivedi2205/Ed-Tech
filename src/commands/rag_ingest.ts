import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { DocumentProcessor } from "../tools/document_processor";
import { chunkText } from "../utils/chunking";
import { GeminiEmbeddingService } from "../tools/embedding";
import { RAGService } from "../services/rag_service";
import { getConvexClient, getWorkspaceId } from "../utils/convex_client";

export interface IngestionReport {
  totalFiles: number;
  indexed: number;
  skippedPageLimit: number;
  skippedAlreadyIndexed: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Derive namespace from folder path
 */
function deriveNamespace(folderPath: string, basePath: string): string {
  const relativePath = path.relative(basePath, folderPath);
  const parts = relativePath.split(path.sep).filter((p) => p.length > 0);
  return parts.length > 0 ? parts[0] : "general";
}

/**
 * Compute SHA-256 hash of file contents
 */
async function computeFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Recursively find all supported files in a directory
 */
async function findSupportedFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findSupportedFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && DocumentProcessor.isSupported(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * RAG ingestion command
 */
export async function ragIngestCommand(
  folderPath: string,
  namespace?: string,
  force: boolean = false
): Promise<IngestionReport> {
  const report: IngestionReport = {
    totalFiles: 0,
    indexed: 0,
    skippedPageLimit: 0,
    skippedAlreadyIndexed: 0,
    failed: 0,
    errors: [],
  };

  // Validate folder exists
  if (!(await fs.pathExists(folderPath))) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  // Initialize services
  const processor = new DocumentProcessor();
  const embeddingService = new GeminiEmbeddingService();
  const workspaceId = getWorkspaceId();
  const convexClient = getConvexClient();
  const convexUrl = process.env.CONVEX_URL || "";
  const ragService = new RAGService(convexUrl, workspaceId);

  // Resolve base path for namespace derivation
  const basePath = path.resolve(folderPath);
  const baseRagCorpus = path.resolve(process.cwd(), "rag_corpus");

  // Find all supported files
  console.log(`Scanning folder: ${folderPath}`);
  const files = await findSupportedFiles(folderPath);
  report.totalFiles = files.length;

  console.log(`Found ${files.length} supported files`);

  // Process each file
  for (const filePath of files) {
    try {
      const fileType = path.extname(filePath);
      const fileName = path.basename(filePath);
      const resolvedPath = path.resolve(filePath);

      // Derive namespace if not provided
      const ragNamespace = namespace || deriveNamespace(resolvedPath, baseRagCorpus);

      console.log(`\nProcessing: ${fileName} (namespace: ${ragNamespace})`);

      // Compute hash
      const hash = await computeFileHash(filePath);

      // Check if already indexed
      if (!force) {
        const existingDoc = await ragService.getDocumentByPath(resolvedPath);
        if (existingDoc && existingDoc.hash === hash && existingDoc.status === "indexed") {
          console.log(`  ✓ Already indexed (skipping)`);
          report.skippedAlreadyIndexed++;
          continue;
        }
      }

      // Count pages
      let pageCount: number;
      try {
        pageCount = await processor.countPages(filePath, fileType);
      } catch (error: any) {
        throw new Error(`Failed to count pages: ${error.message}`);
      }

      // Check page limit
      if (pageCount > 200) {
        console.log(`  ✗ Exceeds page limit (${pageCount} > 200), skipping`);
        await ragService.insertDocument({
          ragNamespace,
          title: fileName,
          sourcePath: resolvedPath,
          pageCount,
          status: "skipped_page_limit",
          hash,
        });
        report.skippedPageLimit++;
        continue;
      }

      // Extract text
      console.log(`  Extracting text (${pageCount} pages)...`);
      const extracted = await processor.extractText(filePath, fileType);

      // Chunk text
      console.log(`  Chunking text...`);
      const chunks = chunkText(extracted.pages, 600, 100);
      console.log(`  Created ${chunks.length} chunks`);

      // Generate embeddings
      console.log(`  Generating embeddings...`);
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await embeddingService.generateEmbeddings(chunkTexts);

      // Insert document
      const docId = await ragService.insertDocument({
        ragNamespace,
        title: fileName,
        sourcePath: resolvedPath,
        pageCount: extracted.pageCount,
        status: "pending",
        hash,
      });

      // Prepare chunks for insertion
      // Note: docId from Convex mutation returns the document ID
      const chunksData = chunks.map((chunk, index) => ({
        docId: String(docId), // Ensure it's a string
        ragNamespace,
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
      console.log(`  Inserting ${chunksData.length} chunks into Convex...`);
      await ragService.insertChunks(chunksData);

      // Update document status to indexed
      const { api } = await import("../../convex/_generated/api");
      await convexClient.mutation(api.rag.insertDocument, {
        workspaceId,
        ragNamespace,
        title: fileName,
        sourcePath: resolvedPath,
        pageCount: extracted.pageCount,
        status: "indexed",
        hash,
      });

      console.log(`  ✓ Successfully indexed`);
      report.indexed++;
    } catch (error: any) {
      console.error(`  ✗ Failed: ${error.message}`);
      report.failed++;
      report.errors.push({
        file: filePath,
        error: error.message,
      });

      // Try to mark as failed in Convex
      try {
        const resolvedPath = path.resolve(filePath);
        const hash = await computeFileHash(filePath);
        const ragNamespace = namespace || deriveNamespace(resolvedPath, baseRagCorpus);
        await ragService.insertDocument({
          ragNamespace,
          title: path.basename(filePath),
          sourcePath: resolvedPath,
          pageCount: 0,
          status: "failed",
          hash,
        });
      } catch (err) {
        // Ignore errors when marking as failed
      }
    }
  }

  // Print summary
  console.log(`\n=== Ingestion Summary ===`);
  console.log(`Total files: ${report.totalFiles}`);
  console.log(`Indexed: ${report.indexed}`);
  console.log(`Skipped (page limit): ${report.skippedPageLimit}`);
  console.log(`Skipped (already indexed): ${report.skippedAlreadyIndexed}`);
  console.log(`Failed: ${report.failed}`);

  if (report.errors.length > 0) {
    console.log(`\nErrors:`);
    report.errors.forEach((err) => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  return report;
}

