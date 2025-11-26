import { ragIngestCommand } from "./rag_ingest";

/**
 * RAG reindex command - re-indexes documents that have changed or forces re-indexing
 */
export async function ragReindexCommand(
  folderPath: string,
  namespace?: string,
  force: boolean = false
) {
  return await ragIngestCommand(folderPath, namespace, force);
}

