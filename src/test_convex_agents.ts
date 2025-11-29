import { getConvexClient } from "./utils/convex_client";
import { api } from "../convex/_generated/api";
import dotenv from "dotenv";

dotenv.config();

async function testConvexAgents() {
  console.log("=== Testing Convex AI Agents ===\n");

  // Check environment variables
  const requiredVars = ["GEMINI_API_KEY", "CONVEX_URL", "OPENROUTER_API_KEY"];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`\n✗ Missing environment variables: ${missingVars.join(", ")}`);
    return;
  }

  console.log("✓ Environment variables configured\n");

  const client = getConvexClient();

  // Step 1: Create or get a test workspace
  console.log("1. Creating test workspace...");
  let workspaceId;
  try {
    workspaceId = await client.mutation(api.mutations.workspaces.createWorkspace, {
      name: `Test Workspace ${Date.now()}`,
      description: "Workspace for testing AI agents",
    });
    console.log(`✓ Workspace created: ${workspaceId}\n`);
  } catch (error: any) {
    console.error(`✗ Failed to create workspace: ${error.message}`);
    // Try to get existing workspace
    const workspaces = await client.query(api.queries.workspaces.listWorkspaces, {});
    if (workspaces && workspaces.length > 0) {
      workspaceId = workspaces[0]._id;
      console.log(`✓ Using existing workspace: ${workspaceId}\n`);
    } else {
      throw error;
    }
  }

  // Step 2: Test RoadmapGeneratorAgent
  console.log("2. Testing RoadmapGeneratorAgent...");
  try {
    const roadmapResult = await client.action(api["actions/roadmap"].generate, {
      workspaceId,
      userInput: "Learn Python programming basics",
    });
    console.log(`✓ Roadmap generated successfully`);
    console.log(`  Roadmap ID: ${roadmapResult.roadmapId}`);
    console.log(`  Topics count: ${Object.keys(roadmapResult.roadmapData || {}).length}\n`);
  } catch (error: any) {
    console.error(`✗ Roadmap generation failed: ${error.message}\n`);
  }

  // Step 3: Test ContentCreatorAgent
  console.log("3. Testing ContentCreatorAgent...");
  try {
    // Create a simple roadmap JSON for content generation
    const testRoadmapJson = {
      "test_topic_1": {
        TopicName: "Introduction to Python",
        ContentList: {
          topics: ["Variables", "Data Types", "Basic Operations"],
        },
      },
    };

    const contentResult = await client.action(api["actions/content"].generate, {
      workspaceId,
      roadmapJson: testRoadmapJson,
      subtopicId: "test_topic_1",
      settings: {
        useRag: false,
        useWebSearch: true,
      },
    });
    console.log(`✓ Content generated successfully`);
    console.log(`  Content ID: ${contentResult.contentId}`);
    console.log(`  Has markdown: ${!!contentResult.content?.markdown}\n`);
  } catch (error: any) {
    console.error(`✗ Content generation failed: ${error.message}\n`);
  }

  // Step 4: Test QuizGeneratorAgent
  console.log("4. Testing QuizGeneratorAgent...");
  try {
    const quizResult = await client.action(api["actions/quiz"].generate, {
      workspaceId,
      subtopicId: "test_quiz_1",
      contentText: `
# Introduction to Python

Python is a high-level programming language known for its simplicity and readability.

## Variables
Variables in Python are used to store data. You can assign values using the = operator.

## Data Types
Python supports various data types including integers, floats, strings, lists, and dictionaries.

## Basic Operations
Python supports arithmetic operations like addition, subtraction, multiplication, and division.
      `.trim(),
      topicName: "Introduction to Python",
    });
    console.log(`✓ Quiz generated successfully`);
    console.log(`  Quiz ID: ${quizResult.quizId}`);
    console.log(`  Questions count: ${quizResult.quiz?.questions?.length || 0}\n`);
  } catch (error: any) {
    console.error(`✗ Quiz generation failed: ${error.message}\n`);
  }

  // Step 5: Test FlashcardGeneratorAgent
  console.log("5. Testing FlashcardGeneratorAgent...");
  try {
    const flashcardResult = await client.action(api["actions/flashcard"].generate, {
      workspaceId,
      subtopicId: "test_flashcard_1",
      contentText: `
# Introduction to Python

Python is a high-level programming language known for its simplicity and readability.

## Variables
Variables in Python are used to store data. You can assign values using the = operator.

## Data Types
Python supports various data types including integers, floats, strings, lists, and dictionaries.
      `.trim(),
      topicName: "Introduction to Python",
    });
    console.log(`✓ Flashcards generated successfully`);
    console.log(`  Flashcard ID: ${flashcardResult.flashcardId}`);
    console.log(`  Cards count: ${flashcardResult.flashcardSet?.cards?.length || 0}\n`);
  } catch (error: any) {
    console.error(`✗ Flashcard generation failed: ${error.message}\n`);
  }

  console.log("=== Testing Complete ===\n");
}

testConvexAgents().catch(console.error);

