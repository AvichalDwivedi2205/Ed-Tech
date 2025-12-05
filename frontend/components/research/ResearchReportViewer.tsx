"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface ResearchReportViewerProps {
  content: string;
  className?: string;
}

export function ResearchReportViewer({ content, className }: ResearchReportViewerProps) {
  return (
    <div className={cn("research-report", className)}>
      <style jsx global>{`
        .research-report {
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.8;
          color: #1f2937;
        }
        
        .dark .research-report {
          color: #e5e7eb;
        }

        .research-report :global(.prose) {
          max-width: 100%;
          font-size: 1.1rem;
        }

        .research-report :global(h1) {
          font-size: 2.5rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 1.5rem;
          line-height: 1.2;
          color: #111827;
          border-bottom: 3px solid #e5e7eb;
          padding-bottom: 1rem;
        }

        .dark .research-report :global(h1) {
          color: #f9fafb;
          border-bottom-color: #374151;
        }

        .research-report :global(h2) {
          font-size: 2rem;
          font-weight: 600;
          margin-top: 3rem;
          margin-bottom: 1.5rem;
          line-height: 1.3;
          color: #111827;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.75rem;
        }

        .dark .research-report :global(h2) {
          color: #f3f4f6;
          border-bottom-color: #374151;
        }

        .research-report :global(h3) {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: #1f2937;
        }

        .dark .research-report :global(h3) {
          color: #e5e7eb;
        }

        .research-report :global(h4) {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: #374151;
        }

        .dark .research-report :global(h4) {
          color: #d1d5db;
        }

        .research-report :global(p) {
          margin-bottom: 1.5rem;
          text-align: justify;
          hyphens: auto;
        }

        .research-report :global(strong) {
          font-weight: 600;
          color: #111827;
        }

        .dark .research-report :global(strong) {
          color: #f9fafb;
        }

        .research-report :global(ul),
        .research-report :global(ol) {
          margin-bottom: 1.5rem;
          padding-left: 2rem;
        }

        .research-report :global(li) {
          margin-bottom: 0.75rem;
        }

        .research-report :global(blockquote) {
          border-left: 4px solid #6366f1;
          padding-left: 1.5rem;
          margin: 2rem 0;
          font-style: italic;
          color: #4b5563;
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }

        .dark .research-report :global(blockquote) {
          background: #1f2937;
          color: #9ca3af;
          border-left-color: #818cf8;
        }

        .research-report :global(code) {
          background: #f3f4f6;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: 'Courier New', monospace;
          color: #dc2626;
        }

        .dark .research-report :global(code) {
          background: #374151;
          color: #fca5a5;
        }

        .research-report :global(pre) {
          background: #1f2937;
          padding: 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 2rem 0;
        }

        .dark .research-report :global(pre) {
          background: #111827;
        }

        .research-report :global(pre code) {
          background: transparent;
          padding: 0;
          color: #e5e7eb;
        }

        .research-report :global(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          font-size: 0.95rem;
        }

        .research-report :global(th),
        .research-report :global(td) {
          border: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          text-align: left;
        }

        .dark .research-report :global(th),
        .dark .research-report :global(td) {
          border-color: #374151;
        }

        .research-report :global(th) {
          background: #f9fafb;
          font-weight: 600;
          color: #111827;
        }

        .dark .research-report :global(th) {
          background: #1f2937;
          color: #f9fafb;
        }

        .research-report :global(hr) {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 3rem 0;
        }

        .dark .research-report :global(hr) {
          border-top-color: #374151;
        }

        .research-report :global(a) {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .dark .research-report :global(a) {
          color: #60a5fa;
        }

        .research-report :global(a:hover) {
          color: #1d4ed8;
        }

        .dark .research-report :global(a:hover) {
          color: #93c5fd;
        }

        /* Citation styling */
        .research-report :global([id^="cite-"]) {
          font-size: 0.85em;
          vertical-align: super;
          color: #6366f1;
          font-weight: 600;
        }

        .dark .research-report :global([id^="cite-"]) {
          color: #818cf8;
        }
      `}</style>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex, rehypeHighlight]}
          components={{
            h1: ({ children }) => <h1 className="text-4xl font-bold mb-6 pb-4 border-b-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-3xl font-semibold mt-12 mb-4 pb-3 border-b">{children}</h2>,
            h3: ({ children }) => <h3 className="text-2xl font-semibold mt-8 mb-3">{children}</h3>,
            p: ({ children }) => <p className="mb-6 leading-relaxed text-justify">{children}</p>,
            ul: ({ children }) => <ul className="mb-6 ml-6 space-y-2 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="mb-6 ml-6 space-y-2 list-decimal">{children}</ol>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-purple-500 pl-6 py-4 my-8 italic bg-purple-50 dark:bg-purple-900/20 rounded-r-lg">
                {children}
              </blockquote>
            ),
            code: ({ inline, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || "");
              if (!inline && match) {
                return (
                  <pre className="bg-slate-900 dark:bg-slate-950 p-4 rounded-lg overflow-x-auto my-6">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              }
              return (
                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono text-red-600 dark:text-red-400" {...props}>
                  {children}
                </code>
              );
            },
            table: ({ children }) => (
              <div className="overflow-x-auto my-8">
                <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-700">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-slate-300 dark:border-slate-700 px-4 py-3 bg-slate-100 dark:bg-slate-800 font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-slate-300 dark:border-slate-700 px-4 py-3">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

