"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { 
  Info, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check,
  BookOpen,
  Video,
  FileText,
  ExternalLink
} from "lucide-react";
import { useState, useCallback } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Custom callout component
function Callout({ type, children }: { type: string; children: React.ReactNode }) {
  const styles = {
    info: {
      container: "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800",
      icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      title: "text-blue-800 dark:text-blue-300",
    },
    tip: {
      container: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800",
      icon: <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      title: "text-emerald-800 dark:text-emerald-300",
    },
    warning: {
      container: "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      title: "text-amber-800 dark:text-amber-300",
    },
    success: {
      container: "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
      title: "text-green-800 dark:text-green-300",
    },
    resources: {
      container: "bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800",
      icon: <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      title: "text-purple-800 dark:text-purple-300",
    },
  };

  const style = styles[type as keyof typeof styles] || styles.info;

  return (
    <div className={cn("my-6 rounded-xl border-2 p-4", style.container)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
        <div className="flex-1 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

// Code block with copy functionality
function CodeBlock({ 
  language, 
  children 
}: { 
  language?: string; 
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-700">
      {/* Language badge and copy button */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
        <span className="text-xs font-medium text-slate-400">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="overflow-x-auto p-4">
        <code className={`language-${language || "plaintext"} text-sm leading-relaxed`}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// Resource link component
function ResourceLink({ type, title, url }: { type: string; title: string; url: string }) {
  const icons = {
    video: <Video className="h-4 w-4 text-red-500" />,
    blog: <FileText className="h-4 w-4 text-emerald-500" />,
    book: <BookOpen className="h-4 w-4 text-violet-500" />,
  };

  const icon = icons[type as keyof typeof icons] || <ExternalLink className="h-4 w-4 text-blue-500" />;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
          {title}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

// Parse custom callout syntax :::type ... :::
function parseCallouts(content: string): string {
  // Handle callouts - we'll process them in the component
  return content;
}

// Parse resource links from :::resources block
function parseResources(content: string): { type: string; title: string; url: string }[] {
  const resourceMatch = content.match(/:::resources\n([\s\S]*?):::/);
  if (!resourceMatch) return [];
  
  const resources: { type: string; title: string; url: string }[] = [];
  const lines = resourceMatch[1].split('\n');
  
  for (const line of lines) {
    const match = line.match(/- \[(video|blog|book)\] \[(.*?)\]\((.*?)\)/);
    if (match) {
      resources.push({
        type: match[1],
        title: match[2],
        url: match[3],
      });
    }
  }
  
  return resources;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Fix over-escaped LaTeX backslashes (common issue from JSON parsing)
  // Convert \\\\ back to \\ for proper LaTeX rendering
  let fixedContent = content
    // Fix quadruple backslashes to double (\\\\mathbf -> \\mathbf)
    .replace(/\\\\\\\\([a-zA-Z])/g, '\\\\$1')
    // Fix triple backslashes to single for LaTeX commands  
    .replace(/\\\\\\([a-zA-Z])/g, '\\$1')
    // Fix escaped braces that are over-escaped
    .replace(/\\\\\\{/g, '\\{')
    .replace(/\\\\\\}/g, '\\}')
    // Fix common LaTeX issues - ensure $$ blocks have proper newlines
    .replace(/\$\$([^\$]+)\$\$/g, (match, content) => {
      // Clean up the content inside $$ blocks
      return '\n$$\n' + content.trim() + '\n$$\n';
    });

  // Detect and wrap unwrapped code blocks
  // Pattern: Lines that look like code but aren't in code blocks
  // Look for patterns like "variable = " or "import " or "def " or "print(" etc.
  const codePatterns = [
    /^(\s*)(import\s+\w+|from\s+\w+\s+import)/gm,
    /^(\s*)(def\s+\w+\s*\(|class\s+\w+)/gm,
    /^(\s*)(for\s+\w+\s+in\s+|while\s+|if\s+\w+)/gm,
    /^(\s*)(\w+\s*=\s*(?:np\.|pd\.|plt\.|torch\.|tf\.))/gm,
    /^(\s*)(print\(f?[\"']|return\s+)/gm,
  ];
  
  // Check if content has code patterns but they're not in code blocks
  // This is a heuristic fix for when LLM doesn't properly wrap code
  const lines = fixedContent.split('\n');
  let inCodeBlock = false;
  let codeBlockStart = -1;
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track code block state
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      processedLines.push(line);
      continue;
    }
    
    // If not in code block, check if line looks like code
    if (!inCodeBlock) {
      const looksLikeCode = codePatterns.some(pattern => {
        pattern.lastIndex = 0; // Reset regex
        return pattern.test(line);
      });
      
      if (looksLikeCode && codeBlockStart === -1) {
        // Start a new code block
        codeBlockStart = i;
        processedLines.push('```python');
        processedLines.push(line);
      } else if (codeBlockStart !== -1) {
        // We're in an auto-detected code section
        const isEmptyOrCode = line.trim() === '' || 
          line.trim().startsWith('#') ||
          /^\s*[\w\[\]{}().,=+\-*/:'"]+/.test(line);
        
        if (isEmptyOrCode && !line.startsWith('##') && !line.startsWith('**')) {
          processedLines.push(line);
        } else {
          // End the auto-detected code block
          processedLines.push('```');
          processedLines.push(line);
          codeBlockStart = -1;
        }
      } else {
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  // Close any unclosed code blocks
  if (codeBlockStart !== -1) {
    processedLines.push('```');
  }
  
  fixedContent = processedLines.join('\n');

  // Extract resources from content
  const resources = parseResources(fixedContent);
  
  // Remove :::resources block from content for markdown parsing
  let processedContent = fixedContent.replace(/:::resources[\s\S]*?:::/g, '');
  
  // Process custom callout blocks - extract them and replace with unique markers
  const calloutRegex = /:::(info|tip|warning|success)\n([\s\S]*?):::/g;
  const callouts: { type: string; content: string; id: string }[] = [];
  
  processedContent = processedContent.replace(calloutRegex, (match, type, innerContent) => {
    const id = `CALLOUT_MARKER_${callouts.length}`;
    callouts.push({ type, content: innerContent.trim(), id });
    // Return a paragraph marker that we can intercept
    return `\n\n${id}\n\n`;
  });

  // Remove any leftover comment markers like <!--CALLOUT_0-->
  processedContent = processedContent.replace(/<!--CALLOUT_\d+-->/g, '');

  return (
    <div className={cn("markdown-content", className)}>
      {/* Resources Section */}
      {resources.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 dark:border-purple-800 dark:from-purple-950/50 dark:to-indigo-950/50">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-200">
              Learning Resources
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource, idx) => (
              <ResourceLink key={idx} {...resource} />
            ))}
          </div>
        </div>
      )}

      {/* Main Markdown Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex, rehypeHighlight]}
          components={{
            // Code blocks
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");
              
              // Check if this is a callout marker
              const calloutMatch = codeString.match(/^CALLOUT_MARKER_(\d+)$/);
              if (calloutMatch) {
                const idx = parseInt(calloutMatch[1]);
                const callout = callouts[idx];
                if (callout) {
                  return <Callout type={callout.type}>{callout.content}</Callout>;
                }
              }
              
              if (!inline && match) {
                return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
              }
              
              // For inline code or code without a language
              if (!inline && codeString.includes('\n')) {
                // Multi-line code without language - treat as code block
                return <CodeBlock language="text">{codeString}</CodeBlock>;
              }
              
              return (
                <code 
                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-pink-600 dark:bg-slate-800 dark:text-pink-400" 
                  {...props}
                >
                  {children}
                </code>
              );
            },
            
            // Check for callout markers in paragraphs
            p({ children, ...props }: any) {
              const text = String(children);
              const calloutMatch = text.match(/^CALLOUT_MARKER_(\d+)$/);
              if (calloutMatch) {
                const idx = parseInt(calloutMatch[1]);
                const callout = callouts[idx];
                if (callout) {
                  return <Callout type={callout.type}>{callout.content}</Callout>;
                }
              }
              return (
                <p className="mb-4 text-slate-700 dark:text-slate-300 leading-7" {...props}>
                  {children}
                </p>
              );
            },
            
            // Headings with better styling
            h1: ({ children }) => (
              <h1 className="mb-6 mt-10 border-b border-slate-200 pb-4 text-4xl font-bold tracking-tight text-slate-900 dark:border-slate-700 dark:text-slate-100">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-4 mt-10 flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                <span className="h-8 w-1 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-3 mt-8 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="mb-2 mt-6 text-lg font-semibold text-slate-800 dark:text-slate-200">
                {children}
              </h4>
            ),
            
            // Lists with better styling
            ul: ({ children }) => (
              <ul className="mb-4 ml-4 list-none space-y-2 text-slate-700 dark:text-slate-300">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-4 list-decimal space-y-2 pl-4 text-slate-700 dark:text-slate-300 marker:font-semibold marker:text-blue-600 dark:marker:text-blue-400">
                {children}
              </ol>
            ),
            li: ({ children, ordered, ...props }: any) => (
              <li className="relative pl-6 before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-blue-500" {...props}>
                {children}
              </li>
            ),
            
            // Blockquotes
            blockquote: ({ children }) => (
              <blockquote className="my-6 border-l-4 border-blue-500 bg-blue-50/50 py-3 pl-6 pr-4 italic text-slate-700 dark:bg-blue-950/30 dark:text-slate-300">
                {children}
              </blockquote>
            ),
            
            // Links
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-500 dark:text-blue-400 dark:decoration-blue-600 dark:hover:text-blue-300"
              >
                {children}
              </a>
            ),
            
            // Tables
            table: ({ children }) => (
              <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-100 dark:bg-slate-800">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                {children}
              </td>
            ),
            tr: ({ children }) => (
              <tr className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                {children}
              </tr>
            ),
            
            // Horizontal rule
            hr: () => (
              <hr className="my-8 border-t-2 border-slate-200 dark:border-slate-700" />
            ),
            
            // Strong and emphasis
            strong: ({ children }) => (
              <strong className="font-bold text-slate-900 dark:text-slate-100">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-slate-700 dark:text-slate-300">
                {children}
              </em>
            ),
            
            // Images
            img: ({ src, alt }) => (
              <figure className="my-6">
                <img 
                  src={src} 
                  alt={alt} 
                  className="rounded-xl border border-slate-200 shadow-lg dark:border-slate-700" 
                />
                {alt && (
                  <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                    {alt}
                  </figcaption>
                )}
              </figure>
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}

