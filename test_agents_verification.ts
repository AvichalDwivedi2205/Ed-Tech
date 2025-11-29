import dotenv from "dotenv";
import { ContentCreatorAgent } from "./src/agents/content_agent";
import { QuizGeneratorAgent } from "./src/agents/quiz_agent";
import { FlashcardGeneratorAgent } from "./src/agents/flashcard_agent";
import { RoadmapGeneratorAgent } from "./src/agents/roadmap_agent";

dotenv.config();

async function verifyAgents() {
  console.log("=== Verifying AI Agents ===\n");

  const results = {
    content: false,
    quiz: false,
    flashcard: false,
    roadmap: false,
  };

  // Test ContentCreatorAgent
  try {
    console.log("1. Testing ContentCreatorAgent...");
    const contentAgent = new ContentCreatorAgent({
      useRag: false,
      useWebSearch: false,
      ragNamespace: "test",
      workspaceId: "test-workspace",
    });
    if (contentAgent && contentAgent.graph) {
      console.log("   ✓ ContentCreatorAgent initialized successfully");
      results.content = true;
    }
  } catch (error: any) {
    console.error(`   ✗ ContentCreatorAgent failed: ${error.message}`);
  }

  // Test QuizGeneratorAgent
  try {
    console.log("2. Testing QuizGeneratorAgent...");
    const quizAgent = new QuizGeneratorAgent();
    if (quizAgent && quizAgent.graph) {
      console.log("   ✓ QuizGeneratorAgent initialized successfully");
      results.quiz = true;
    }
  } catch (error: any) {
    console.error(`   ✗ QuizGeneratorAgent failed: ${error.message}`);
  }

  // Test FlashcardGeneratorAgent
  try {
    console.log("3. Testing FlashcardGeneratorAgent...");
    const flashcardAgent = new FlashcardGeneratorAgent();
    if (flashcardAgent && flashcardAgent.graph) {
      console.log("   ✓ FlashcardGeneratorAgent initialized successfully");
      results.flashcard = true;
    }
  } catch (error: any) {
    console.error(`   ✗ FlashcardGeneratorAgent failed: ${error.message}`);
  }

  // Test RoadmapGeneratorAgent
  try {
    console.log("4. Testing RoadmapGeneratorAgent...");
    const roadmapAgent = new RoadmapGeneratorAgent();
    if (roadmapAgent && roadmapAgent.graph) {
      console.log("   ✓ RoadmapGeneratorAgent initialized successfully");
      results.roadmap = true;
    }
  } catch (error: any) {
    console.error(`   ✗ RoadmapGeneratorAgent failed: ${error.message}`);
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`ContentCreatorAgent: ${results.content ? "✓" : "✗"}`);
  console.log(`QuizGeneratorAgent: ${results.quiz ? "✓" : "✗"}`);
  console.log(`FlashcardGeneratorAgent: ${results.flashcard ? "✓" : "✗"}`);
  console.log(`RoadmapGeneratorAgent: ${results.roadmap ? "✓" : "✗"}`);

  const allPassed = Object.values(results).every((r) => r === true);
  if (allPassed) {
    console.log("\n✓ All agents initialized successfully!");
  } else {
    console.log("\n✗ Some agents failed to initialize");
    process.exit(1);
  }
}

verifyAgents().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

