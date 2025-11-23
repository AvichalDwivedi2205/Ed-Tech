import { Doc, Block, InlineSpan } from "../types/content_schema";

export function renderDocToHtml(doc: Doc): string {
    const blocksHtml = doc.blocks.map(renderBlock).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${doc.title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
    <style>
        :root {
            --primary: #2563eb;
            --bg: #ffffff;
            --text: #1f2937;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-800: #1f2937;
        }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: var(--text);
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: var(--bg);
        }
        h1, h2, h3, h4 { color: var(--gray-800); margin-top: 2rem; margin-bottom: 1rem; }
        h1 { font-size: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 1rem; }
        h2 { font-size: 1.8rem; border-bottom: 1px solid var(--gray-100); padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; }
        
        .callout {
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1.5rem 0;
            border-left: 4px solid;
        }
        .callout-example { background: #f0fdf4; border-color: #22c55e; }
        .callout-note { background: #eff6ff; border-color: #3b82f6; }
        .callout-warning { background: #fefce8; border-color: #eab308; }
        .callout-title { font-weight: bold; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
        
        .equation-block {
            padding: 1rem;
            background: var(--gray-100);
            border-radius: 0.5rem;
            text-align: center;
            margin: 1.5rem 0;
            overflow-x: auto;
        }
        
        code {
            background: var(--gray-100);
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
        }
        pre code {
            display: block;
            padding: 1rem;
            overflow-x: auto;
        }
        
        .resources {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid var(--gray-200);
        }
        .resource-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .resource-tag {
            font-size: 0.75rem;
            font-weight: bold;
            padding: 0.1rem 0.4rem;
            border-radius: 0.25rem;
            text-transform: uppercase;
        }
        .tag-video { background: #fee2e2; color: #991b1b; }
        .tag-article { background: #dbeafe; color: #1e40af; }
        
        a { color: var(--primary); text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <article>
        <h1>${doc.title}</h1>
        <div class="meta">
            ${doc.meta?.topic ? `<span>Topic: ${doc.meta.topic}</span>` : ''}
        </div>
        ${blocksHtml}
    </article>
</body>
</html>`;
}

function renderBlock(block: Block): string {
    switch (block.type) {
        case "heading":
            const Tag = `h${block.level}` as any;
            return `<${Tag}>${renderSpans(block.content)}</${Tag}>`;

        case "paragraph":
            return `<p>${renderSpans(block.content)}</p>`;

        case "list":
            const ListTag = block.style === "ordered" ? "ol" : "ul";
            const itemsHtml = block.items.map(item => `<li>${renderSpans(item.content)}</li>`).join('');
            return `<${ListTag}>${itemsHtml}</${ListTag}>`;

        case "callout":
            return `<div class="callout callout-${block.variant}">
                ${block.title ? `<div class="callout-title">${block.icon || ''} ${renderSpans(block.title)}</div>` : ''}
                <div class="callout-body">${renderSpans(block.content)}</div>
            </div>`;

        case "equation":
            return `<div class="equation-block">$$ ${block.math} $$</div>`;

        case "code":
            return `<pre><code>${block.code}</code></pre>`;

        case "resources":
            return `<div class="resources">
                <h3>Further Resources</h3>
                ${block.items.map(item => `
                    <div class="resource-item">
                        <span class="resource-tag tag-${item.kind}">${item.kind}</span>
                        <a href="${item.url}" target="_blank">${item.title}</a>
                    </div>
                `).join('')}
            </div>`;

        default:
            return '';
    }
}

function renderSpans(spans: InlineSpan[]): string {
    return spans.map(span => {
        let text = span.text;

        if (span.bold) text = `<strong>${text}</strong>`;
        if (span.italic) text = `<em>${text}</em>`;
        if (span.code) text = `<code>${text}</code>`;
        if (span.underline) text = `<u>${text}</u>`;
        if (span.strike) text = `<s>${text}</s>`;
        if (span.mathInline) text = `$${span.mathInline}$`; // KaTeX auto-render will pick this up

        if (span.link) {
            text = `<a href="${span.link.url}" target="_blank" title="${span.link.title || ''}">${text}</a>`;
        }

        return text;
    }).join('');
}
