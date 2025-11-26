import { RAGService } from "./services/rag_service";
import { getWorkspaceId } from "./utils/convex_client";
import dotenv from "dotenv";

dotenv.config();

async function testRAGRetrieval() {
  console.log("=== Testing RAG Retrieval ===\n");

  const workspaceId = getWorkspaceId();
  const convexUrl = process.env.CONVEX_URL || "";
  const ragService = new RAGService(convexUrl, workspaceId);

  const testQuery = "Explain noise in communication systems and random variables";
  console.log(`Query: "${testQuery}"\n`);

  try {
    const result = await ragService.retrieve(testQuery, "test", 5);
    
    console.log(`✓ Retrieved ${result.chunks.length} chunks\n`);
    console.log("=== RAG Context ===\n");
    console.log(result.formattedContext);
    
    console.log("\n=== Chunk Details ===\n");
    result.chunks.forEach((chunk, i) => {
      console.log(`Chunk ${i + 1}:`);
      console.log(`  Similarity: ${chunk.similarity.toFixed(4)}`);
      console.log(`  Pages: ${chunk.pageStart}-${chunk.pageEnd}`);
      console.log(`  Text preview: ${chunk.text.substring(0, 100)}...\n`);
    });
    
    console.log("✓ RAG retrieval test completed successfully!");
  } catch (error: any) {
    console.error(`✗ RAG retrieval failed: ${error.message}`);
    console.error(error.stack);
  }
}

testRAGRetrieval().catch(console.error);

