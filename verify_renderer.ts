
import { renderDocToHtml } from './src/utils/html_renderer';
import { Doc } from './src/types/content_schema';
import fs from 'fs';
import path from 'path';

const sampleDoc: Doc = {
    id: "test-doc",
    title: "Test Document for Rich Text",
    meta: {
        topic: "Testing",
        createdAt: new Date().toISOString()
    },
    blocks: [
        {
            id: "b1",
            type: "heading",
            level: 1,
            content: [{ text: "Main Heading" }]
        },
        {
            id: "b2",
            type: "paragraph",
            content: [
                { text: "This is a paragraph with " },
                { text: "bold", bold: true },
                { text: ", " },
                { text: "italic", italic: true },
                { text: ", " },
                { text: "underline", underline: true },
                { text: ", " },
                { text: "strike", strike: true },
                { text: ", " },
                { text: "code", code: true },
                { text: ", " },
                { text: "subscript", subscript: true },
                { text: " (sub), " },
                { text: "superscript", superscript: true },
                { text: " (sup), and " },
                { text: "red text", color: "red" },
                { text: "." }
            ]
        },
        {
            id: "b3",
            type: "equation",
            math: "E = mc^2",
            display: "block"
        },
        {
            id: "b4",
            type: "callout",
            variant: "info",
            title: [{ text: "Info Callout" }],
            content: [{ text: "This is an info callout." }]
        },
        {
            id: "b5",
            type: "list",
            style: "bullet",
            items: [
                { content: [{ text: "Item 1" }] },
                { content: [{ text: "Item 2" }] }
            ]
        },
        {
            id: "b6",
            type: "divider"
        },
        {
            id: "b7",
            type: "table",
            header: [
                {
                    cells: [
                        { content: [{ text: "Header 1", bold: true }] },
                        { content: [{ text: "Header 2", bold: true }] }
                    ]
                }
            ],
            rows: [
                {
                    cells: [
                        { content: [{ text: "Row 1 Col 1" }] },
                        { content: [{ text: "Row 1 Col 2" }] }
                    ]
                },
                {
                    cells: [
                        { content: [{ text: "Row 2 Col 1" }] },
                        { content: [{ text: "Row 2 Col 2" }] }
                    ]
                }
            ]
        }
    ]
};

const html = renderDocToHtml(sampleDoc);
const outputPath = path.join(process.cwd(), 'test_output.html');
fs.writeFileSync(outputPath, html);
console.log(`HTML saved to ${outputPath}`);
