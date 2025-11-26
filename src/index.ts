import inquirer from "inquirer";
import { RoadmapGeneratorAgent } from "./agents/roadmap_agent";
import { ContentCreatorAgent } from "./agents/content_agent";
import { QuizGeneratorAgent } from "./agents/quiz_agent";
import { FlashcardGeneratorAgent } from "./agents/flashcard_agent";
import { HumanMessage } from "@langchain/core/messages";
import fs from "fs-extra";
import path from "path";
import { ragIngestCommand } from "./commands/rag_ingest";
import { ragReindexCommand } from "./commands/rag_reindex";
import { ContentGenerationSettings } from "./types/content_schema";
import { getWorkspaceId } from "./utils/convex_client";

async function main() {
    console.log("Welcome to the Roadmap Generator & Content Creator CLI!");

    const { mode } = await inquirer.prompt([
        {
            type: "list",
            name: "mode",
            message: "What would you like to do?",
            choices: [
                "Generate Roadmap",
                "Create Content from Roadmap",
                "Generate Content with RAG",
                "RAG: Ingest Documents",
                "RAG: Reindex Documents",
                "Generate Quiz",
                "Generate Flashcards",
            ],
        },
    ]);

    if (mode === "Generate Roadmap") {
        await runRoadmapGenerator();
    } else if (mode === "Create Content from Roadmap") {
        await runContentCreator();
    } else if (mode === "Generate Content with RAG") {
        await runContentGeneratorWithRAG();
    } else if (mode === "RAG: Ingest Documents") {
        await runRAGIngest();
    } else if (mode === "RAG: Reindex Documents") {
        await runRAGReindex();
    } else if (mode === "Generate Quiz") {
        await runQuizGenerator();
    } else {
        await runFlashcardGenerator();
    }
}

async function runRoadmapGenerator() {
    const agent = new RoadmapGeneratorAgent();

    const { inputType } = await inquirer.prompt([
        {
            type: "list",
            name: "inputType",
            message: "How would you like to provide input?",
            choices: ["Text Topic", "Upload File (PDF/Image)"],
        },
    ]);

    let initialInputs: any = { messages: [] };

    if (inputType === "Text Topic") {
        const { topic } = await inquirer.prompt([
            {
                type: "input",
                name: "topic",
                message: "Enter the topic you want to learn:",
            },
        ]);
        initialInputs.user_input = topic;
        initialInputs.messages.push(new HumanMessage(topic));
    } else {
        const { filePath } = await inquirer.prompt([
            {
                type: "input",
                name: "filePath",
                message: "Enter the absolute path to the file:",
            },
        ]);
        initialInputs.file_path = filePath;
    }

    console.log("\nStarting Roadmap Agent...\n");

    let currentState = initialInputs;

    // Run the graph
    // We need to handle the loop manually to support user input during clarification

    while (true) {
        const result = await agent.graph.invoke(currentState);

        // Update state
        currentState = result;

        // Check if we are waiting for response
        if (result.waiting_for_response) {
            // Print the last message from AI
            const lastMsg = result.messages[result.messages.length - 1];
            console.log(`\nAI: ${lastMsg.content}\n`);

            // Get user input
            const { response } = await inquirer.prompt([
                {
                    type: "input",
                    name: "response",
                    message: "Your answer:",
                }
            ]);

            // Add user response to messages
            currentState.messages.push(new HumanMessage(response));
            currentState.user_input = response; // Update user input context
            currentState.waiting_for_response = false; // Clear flag

            // Continue loop
            continue;
        }

        // Check if finished
        if (result.final_roadmap) {
            console.log("\n=== FINAL ROADMAP ===\n");
            console.log(result.final_roadmap);

            // Save to file
            const outputPath = path.join(process.cwd(), "roadmap.json");
            await fs.writeFile(outputPath, result.final_roadmap);
            console.log(`\nRoadmap saved to ${outputPath}`);
            break;
        }

        // If we are here, it means the graph ended without final roadmap (maybe error or unexpected state)
        // But our graph structure should either loop or end with roadmap.
        // One case is if we hit END from clarification without generating (shouldn't happen with current logic).
        break;
    }
}

async function runContentCreator() {
    const agent = new ContentCreatorAgent();

    const { roadmapPath } = await inquirer.prompt([
        {
            type: "input",
            name: "roadmapPath",
            message: "Enter path to roadmap.json:",
            default: "./roadmap.json"
        }
    ]);

    if (!fs.existsSync(roadmapPath)) {
        console.error("Roadmap file not found!");
        return;
    }

    const roadmapJson = await fs.readJson(roadmapPath);
    let completedSubtopics: string[] = [];

    console.log("\nStarting Content Creator Agent...\n");

    while (true) {
        const result = await agent.graph.invoke({
            roadmap_json: roadmapJson,
            completed_subtopics: completedSubtopics
        });

        const subtopicId = result.current_subtopic_id;

        if (!subtopicId) {
            console.log("\nAll subtopics processed!");
            break;
        }

        // Mark as completed
        completedSubtopics.push(subtopicId);

        // Ask user if they want to continue
        const { continueGen } = await inquirer.prompt([
            {
                type: "confirm",
                name: "continueGen",
                message: `Content generated for "${result.current_subtopic_data?.TopicName}". Continue to next subtopic?`,
                default: true
            }
        ]);

        if (!continueGen) {
            console.log("\nStopping content generation.");
            break;
        }
    }
}

async function runContentGeneratorWithRAG() {
    const { prompt } = await inquirer.prompt([
        {
            type: "input",
            name: "prompt",
            message: "Enter your content generation prompt:",
        },
    ]);

    const { ragNamespace } = await inquirer.prompt([
        {
            type: "input",
            name: "ragNamespace",
            message: "Enter RAG namespace (e.g., 'general', 'brand', 'product'):",
            default: "general",
        },
    ]);

    const { useRag } = await inquirer.prompt([
        {
            type: "confirm",
            name: "useRag",
            message: "Use RAG context?",
            default: true,
        },
    ]);

    const { useWebSearch } = await inquirer.prompt([
        {
            type: "confirm",
            name: "useWebSearch",
            message: "Use web search?",
            default: true,
        },
    ]);

    const workspaceId = getWorkspaceId();
    const settings: ContentGenerationSettings = {
        useRag,
        useWebSearch,
        ragNamespace,
        workspaceId,
    };

    const agent = new ContentCreatorAgent(settings);

    console.log("\nStarting Content Generator with RAG...\n");
    console.log(`Settings: RAG=${useRag}, WebSearch=${useWebSearch}, Namespace=${ragNamespace}\n`);

    // For now, we'll create a simple roadmap-like structure for single prompt generation
    // In a full implementation, you might want a dedicated single-prompt content generator
    const mockRoadmap = {
        single_prompt: {
            TopicName: prompt,
            ContentList: { topics: [] },
        },
    };

    const result = await agent.graph.invoke({
        roadmap_json: mockRoadmap,
        completed_subtopics: [],
        settings,
    });

    console.log("\nContent generation completed!");
}

async function runRAGIngest() {
    const { folderPath } = await inquirer.prompt([
        {
            type: "input",
            name: "folderPath",
            message: "Enter folder path to ingest (relative to project root or absolute):",
            default: "./rag_corpus",
        },
    ]);

    const { namespace } = await inquirer.prompt([
        {
            type: "input",
            name: "namespace",
            message: "Enter namespace (leave empty to derive from folder structure):",
            default: "",
        },
    ]);

    const resolvedPath = path.isAbsolute(folderPath)
        ? folderPath
        : path.resolve(process.cwd(), folderPath);

    console.log(`\nIngesting documents from: ${resolvedPath}`);
    if (namespace) {
        console.log(`Using namespace: ${namespace}`);
    }

    try {
        const report = await ragIngestCommand(resolvedPath, namespace || undefined, false);
        console.log("\n✓ Ingestion completed successfully!");
    } catch (error: any) {
        console.error(`\n✗ Ingestion failed: ${error.message}`);
    }
}

async function runRAGReindex() {
    const { folderPath } = await inquirer.prompt([
        {
            type: "input",
            name: "folderPath",
            message: "Enter folder path to reindex (relative to project root or absolute):",
            default: "./rag_corpus",
        },
    ]);

    const { namespace } = await inquirer.prompt([
        {
            type: "input",
            name: "namespace",
            message: "Enter namespace (leave empty to derive from folder structure):",
            default: "",
        },
    ]);

    const { force } = await inquirer.prompt([
        {
            type: "confirm",
            name: "force",
            message: "Force re-indexing of all files (ignore hash checks)?",
            default: false,
        },
    ]);

    const resolvedPath = path.isAbsolute(folderPath)
        ? folderPath
        : path.resolve(process.cwd(), folderPath);

    console.log(`\nReindexing documents from: ${resolvedPath}`);
    if (namespace) {
        console.log(`Using namespace: ${namespace}`);
    }
    if (force) {
        console.log("Force mode: re-indexing all files");
    }

    try {
        const report = await ragReindexCommand(resolvedPath, namespace || undefined, force);
        console.log("\n✓ Reindexing completed successfully!");
    } catch (error: any) {
        console.error(`\n✗ Reindexing failed: ${error.message}`);
    }
}

async function runQuizGenerator() {
    const agent = new QuizGeneratorAgent();
    const generatedDir = path.join(process.cwd(), "generated_content");

    if (!fs.existsSync(generatedDir)) {
        console.error("No generated content found. Please run Content Creator first.");
        return;
    }

    const subdirs = await fs.readdir(generatedDir);
    const availableTopics = [];

    for (const subdir of subdirs) {
        const contentPath = path.join(generatedDir, subdir, "content.json");
        if (fs.existsSync(contentPath)) {
            availableTopics.push(subdir);
        }
    }

    if (availableTopics.length === 0) {
        console.error("No valid content found in generated_content directory.");
        return;
    }

    const { selectedTopics } = await inquirer.prompt([
        {
            type: "checkbox",
            name: "selectedTopics",
            message: "Select topics to generate quizzes for:",
            choices: availableTopics,
            validate: (answer) => {
                if (answer.length < 1) {
                    return "You must choose at least one topic.";
                }
                return true;
            },
        },
    ]);

    console.log("\nStarting Quiz Generator Agent...\n");

    for (const topicId of selectedTopics) {
        console.log(`\n--- Processing: ${topicId} ---\n`);
        await agent.graph.invoke({
            subtopic_id: topicId
        });
    }

    console.log("\nAll quizzes generated successfully!");
}

async function runFlashcardGenerator() {
    const agent = new FlashcardGeneratorAgent();
    const generatedDir = path.join(process.cwd(), "generated_content");

    if (!fs.existsSync(generatedDir)) {
        console.error("No generated content found. Please run Content Creator first.");
        return;
    }

    const subdirs = await fs.readdir(generatedDir);
    const availableTopics = [];

    for (const subdir of subdirs) {
        const contentPath = path.join(generatedDir, subdir, "content.json");
        if (fs.existsSync(contentPath)) {
            availableTopics.push(subdir);
        }
    }

    if (availableTopics.length === 0) {
        console.error("No valid content found in generated_content directory.");
        return;
    }

    const { selectedTopics } = await inquirer.prompt([
        {
            type: "checkbox",
            name: "selectedTopics",
            message: "Select topics to generate flashcards for:",
            choices: availableTopics,
            validate: (answer) => {
                if (answer.length < 1) {
                    return "You must choose at least one topic.";
                }
                return true;
            },
        },
    ]);

    console.log("\nStarting Flashcard Generator Agent...\n");

    for (const topicId of selectedTopics) {
        console.log(`\n--- Processing: ${topicId} ---\n`);
        await agent.graph.invoke({
            subtopic_id: topicId
        });
    }

    console.log("\nAll flashcards generated successfully!");
}

main().catch(console.error);
