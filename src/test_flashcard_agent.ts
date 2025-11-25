
import { FlashcardGeneratorAgent } from "./agents/flashcard_agent";
import fs from "fs-extra";
import path from "path";

async function testFlashcards() {
    console.log("Starting Flashcard Agent Test...");

    // Ensure we have content for subtopic "1"
    const contentPath = path.join(process.cwd(), "generated_content", "1", "content.json");
    if (!await fs.pathExists(contentPath)) {
        console.error("Content not found! Please run test_simple_markdown.ts first.");
        return;
    }

    const agent = new FlashcardGeneratorAgent();

    console.log("Invoking flashcard agent for subtopic '1'...");
    const result = await agent.graph.invoke({
        subtopic_id: "1"
    });

    console.log("Flashcard Agent finished.");

    if (result.final_flashcard_set) {
        console.log("Topic:", result.final_flashcard_set.topicName);
        console.log("Number of cards:", result.final_flashcard_set.cards.length);

        const jsonPath = path.join(process.cwd(), "generated_content", "1", "flashcards.json");
        if (await fs.pathExists(jsonPath)) {
            console.log("PASS: Flashcards JSON saved.");
        } else {
            console.error("FAIL: Flashcards JSON not found.");
        }

        const htmlPath = path.join(process.cwd(), "generated_content", "1", "flashcards.html");
        if (await fs.pathExists(htmlPath)) {
            console.log("PASS: Flashcards HTML saved.");
        } else {
            console.error("FAIL: Flashcards HTML not found.");
        }
    } else {
        console.error("FAIL: No flashcard set generated.");
    }
}

testFlashcards().catch(console.error);
