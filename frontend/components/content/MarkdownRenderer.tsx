"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Customize code blocks
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <pre className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800" {...props}>
                {children}
              </code>
            );
          },
          // Customize headings
          h1: ({ children }) => (
            <h1 className="mb-4 mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {children}
            </h3>
          ),
          // Customize paragraphs
          p: ({ children }) => (
            <p className="mb-4 text-slate-700 dark:text-slate-300 leading-7">
              {children}
            </p>
          ),
          // Customize lists
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc space-y-2 text-slate-700 dark:text-slate-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-2 text-slate-700 dark:text-slate-300">
              {children}
            </ol>
          ),
          // Customize blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-blue-500 pl-4 italic text-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

