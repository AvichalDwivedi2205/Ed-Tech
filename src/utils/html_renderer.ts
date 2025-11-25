export function renderMarkdownToHtml(markdown: string, title: string): string {
    // Escape backticks in markdown to safely embed in JS string
    const safeMarkdown = markdown.replace(/`/g, "\\`").replace(/\${/g, "\\${");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- KaTeX for Math -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

    <!-- Marked for Markdown -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    
    <!-- Highlight.js for Code -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

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
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background: var(--bg);
        }
        h1, h2, h3, h4 { color: var(--gray-800); margin-top: 2rem; margin-bottom: 1rem; }
        h1 { font-size: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 1rem; }
        h2 { font-size: 1.8rem; border-bottom: 1px solid var(--gray-100); padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; }
        
        /* Callouts */
        .callout {
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1.5rem 0;
            border-left: 4px solid;
            background: var(--gray-100);
        }
        .callout-info { background: #eff6ff; border-color: #3b82f6; }
        .callout-warning { background: #fefce8; border-color: #eab308; }
        .callout-note { background: #f3f4f6; border-color: #6b7280; }
        .callout-tip { background: #f0fdf4; border-color: #22c55e; }
        
        .callout-title { font-weight: bold; margin-bottom: 0.5rem; display: block; }
        
        /* Code Blocks */
        pre {
            background: #0d1117;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            color: #c9d1d9;
        }
        code {
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
        }
        p code {
            background: var(--gray-100);
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            color: var(--text);
        }

        /* Tables */
        table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
        th, td { border: 1px solid var(--gray-200); padding: 0.75rem; text-align: left; }
        th { background: var(--gray-100); font-weight: bold; }
        
        blockquote {
            border-left: 4px solid var(--gray-200);
            padding-left: 1rem;
            margin-left: 0;
            color: #4b5563;
        }

        /* Resources */
        .resources-block {
            margin-top: 2rem;
            padding: 1rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
        }
        .resources-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <article id="content">
        <!-- Content will be rendered here -->
    </article>

    <script>
        const rawMarkdown = \`${safeMarkdown}\`;

        // Configure Marked
        marked.use({
            gfm: true,
            breaks: true,
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            }
        });

        // Custom Pre-processing for Callouts
        // :::variant Title
        // Content
        // :::
        function processCallouts(md) {
            const regex = /:::(\w+)(?:[ \\t]+(.*?))?\\n([\\s\\S]*?)\\n:::/g;
            return md.replace(regex, (match, variant, title, content) => {
                const titleHtml = title ? \`<div class="callout-title">\${title}</div>\` : '';
                // Recursively parse markdown in content
                const contentHtml = marked.parse(content);
                return \`<div class="callout callout-\${variant}">\${titleHtml}\${contentHtml}</div>\`;
            });
        }

        // Custom Pre-processing for Resources
        // :::resources
        // - [kind] [Title](url)
        // :::
        function processResources(md) {
            const regex = /:::resources\\n([\\s\\S]*?)\\n:::/g;
            return md.replace(regex, (match, content) => {
                const contentHtml = marked.parse(content);
                return \`<div class="resources-block"><div class="resources-title">Resources</div>\${contentHtml}</div>\`;
            });
        }

        // Process and Render
        let processed = processCallouts(rawMarkdown);
        processed = processResources(processed);
        
        document.getElementById('content').innerHTML = marked.parse(processed);

        // Render Math
        document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError : false
            });
        });
    </script>
</body>
</html>`;
}

