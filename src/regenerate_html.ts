
import fs from "fs-extra";
import path from "path";
import { renderMarkdownToHtml } from "./utils/html_renderer";

async function regenerate() {
    const contentDir = path.join(process.cwd(), "generated_content", "1");
    const jsonPath = path.join(contentDir, "content.json");

    if (!await fs.pathExists(jsonPath)) {
        console.error("Content file not found:", jsonPath);
        return;
    }

    const content = await fs.readJson(jsonPath);

    if (!content.markdown) {
        console.error("No markdown found in content.json");
        return;
    }

    console.log("Regenerating HTML for:", content.title);
    const html = renderMarkdownToHtml(content.markdown, content.title);

    await fs.writeFile(path.join(contentDir, "index.html"), html);
    console.log("HTML regenerated at:", path.join(contentDir, "index.html"));
}

regenerate().catch(console.error);
