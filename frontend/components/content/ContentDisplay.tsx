'use client'

import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ContentDisplayProps {
  content: string
  className?: string
}

export function ContentDisplay({ content, className }: ContentDisplayProps) {

  const renderContent = () => {
    // Simple approach: render markdown and handle LaTeX separately
    // Split content by LaTeX blocks first
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g
    const parts: Array<{ type: 'text' | 'block'; content: string }> = []
    let lastIndex = 0
    let match

    while ((match = blockMathRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.substring(lastIndex, match.index) })
      }
      parts.push({ type: 'block', content: match[1].trim() })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.substring(lastIndex) })
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content })
    }

    return parts.map((part, index) => {
      if (part.type === 'block') {
        try {
          return (
            <div key={index} className="my-6 flex justify-center">
              <BlockMath math={part.content} />
            </div>
          )
        } catch (e) {
          return (
            <div key={index} className="my-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">Invalid LaTeX equation:</p>
              <code className="text-xs">$${part.content}$$</code>
            </div>
          )
        }
      } else {
        // Process inline math in text
        const inlineParts: Array<string | { type: 'inline'; math: string }> = []
        const inlineRegex = /\$([^$\n]+)\$/g
        let text = part.content
        let inlineLastIndex = 0
        let inlineMatch

        while ((inlineMatch = inlineRegex.exec(text)) !== null) {
          if (inlineMatch.index > inlineLastIndex) {
            inlineParts.push(text.substring(inlineLastIndex, inlineMatch.index))
          }
          inlineParts.push({ type: 'inline', math: inlineMatch[1].trim() })
          inlineLastIndex = inlineMatch.index + inlineMatch[0].length
        }

        if (inlineLastIndex < text.length) {
          inlineParts.push(text.substring(inlineLastIndex))
        }

        if (inlineParts.length === 1 && typeof inlineParts[0] === 'string') {
          // No inline math, render as markdown
          return (
            <ReactMarkdown
              key={index}
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-semibold mt-5 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
                h4: ({ children }) => <h4 className="text-lg font-semibold mt-3 mb-2">{children}</h4>,
                p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="ml-4">{children}</li>,
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic my-4">{children}</blockquote>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
          )
        } else {
          // Has inline math, render mixed content
          return (
            <div key={index}>
              {inlineParts.map((inlinePart, inlineIndex) => {
                if (typeof inlinePart === 'string') {
                  return (
                    <ReactMarkdown
                      key={inlineIndex}
                      components={{
                        p: ({ children }) => <span>{children}</span>,
                        h1: ({ children }) => <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-2xl font-semibold mt-5 mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-lg font-semibold mt-3 mb-2">{children}</h4>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                        li: ({ children }) => <li className="ml-4">{children}</li>,
                        code: ({ children, className }) => {
                          const isInline = !className
                          return isInline ? (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>
                          ) : (
                            <code className={className}>{children}</code>
                          )
                        },
                        pre: ({ children }) => (
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {inlinePart}
                    </ReactMarkdown>
                  )
                } else {
                  try {
                    return <InlineMath key={inlineIndex} math={inlinePart.math} />
                  } catch (e) {
                    return <span key={inlineIndex} className="text-red-500">${inlinePart.math}$</span>
                  }
                }
              })}
            </div>
          )
        }
      }
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="prose prose-sm max-w-none">
            {renderContent()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

