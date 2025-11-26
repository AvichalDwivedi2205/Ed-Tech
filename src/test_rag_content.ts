import { ContentCreatorAgent } from "./agents/content_agent";
import { ContentGenerationSettings } from "./types/content_schema";
import { getWorkspaceId } from "./utils/convex_client";
import dotenv from "dotenv";

dotenv.config();

async function testRAGContentGeneration() {
  console.log("=== Testing RAG Content Generation ===\n");

  // Check environment variables
  const requiredVars = ["GEMINI_API_KEY", "CONVEX_URL", "OPENROUTER_API_KEY"];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`\n✗ Missing environment variables: ${missingVars.join(", ")}`);
    return;
  }

  console.log("✓ Environment variables configured\n");

  // Create settings with RAG enabled
  const workspaceId = getWorkspaceId();
  const settings: ContentGenerationSettings = {
    useRag: true,
    useWebSearch: false, // Disable web search to test RAG only
    ragNamespace: "test", // Use the namespace we indexed
    workspaceId,
  };

  console.log("Settings:");
  console.log(`  - RAG: ${settings.useRag}`);
  console.log(`  - Web Search: ${settings.useWebSearch}`);
  console.log(`  - Namespace: ${settings.ragNamespace}`);
  console.log(`  - Workspace ID: ${settings.workspaceId}\n`);

  // Create a simple prompt that should match the indexed documents
  const testPrompt = "Explain noise in communication systems and random variables";
  const topicId = `test_rag_content_${Date.now()}`; // Use timestamp to avoid skipping

  console.log(`Test Prompt: "${testPrompt}"\n`);

  // Create agent with settings
  const agent = new ContentCreatorAgent(settings);

  // Create a mock roadmap structure for single prompt generation
  const mockRoadmap = {
    [topicId]: {
      TopicName: testPrompt,
      ContentList: { topics: ["noise", "communication systems", "random variables"] },
    },
  };

  console.log("Starting content generation with RAG...\n");

  try {
    const result = await agent.graph.invoke({
      roadmap_json: mockRoadmap,
      completed_subtopics: [],
      settings,
    });

    console.log("\n=== Content Generation Result ===\n");

    if (result.final_json && typeof result.final_json === "object" && "markdown" in result.final_json) {
      const content = result.final_json as any;
      console.log(`Title: ${content.title || "N/A"}`);
      console.log(`\nGenerated Content (first 500 chars):\n`);
      console.log(content.markdown?.substring(0, 500) || "No content generated");
      console.log("\n...\n");
      console.log(`Total length: ${content.markdown?.length || 0} characters\n`);

      // Check if RAG context was used
      if (result.ragContext) {
        console.log("✓ RAG context was retrieved and used");
        console.log(`RAG context length: ${result.ragContext.length} characters\n`);
      } else {
        console.log("⚠ No RAG context found in result\n");
      }
    } else {
      console.log("Result structure:", JSON.stringify(result, null, 2).substring(0, 500));
    }

    console.log("\n✓ Content generation test completed!");
  } catch (error: any) {
    console.error(`\n✗ Content generation failed: ${error.message}`);
    console.error(error.stack);
  }
}

testRAGContentGeneration().catch(console.error);

