import { ContentCreatorAgent } from "./agents/content_agent";
import fs from "fs-extra";
import path from "path";

async function run() {
    const agent = new ContentCreatorAgent();
    const roadmapPath = path.join(process.cwd(), "roadmap.json");

    if (!fs.existsSync(roadmapPath)) {
        console.error("Roadmap file not found at", roadmapPath);
        return;
    }

    const roadmapJson = await fs.readJson(roadmapPath);

    console.log("Starting Content Creator Agent Test...");

    // Run for just one subtopic to verify fix
    // The graph loop handles one subtopic at a time and returns.
    // We just want to see if it crashes or logs errors.

    try {
        const result = await agent.graph.invoke({
            roadmap_json: roadmapJson,
            completed_subtopics: []
        });
        console.log("Agent finished successfully for one subtopic.");
        console.log("Current Subtopic ID:", result.current_subtopic_id);
    } catch (e) {
        console.error("Agent failed:", e);
    }
}

run().catch(console.error);
