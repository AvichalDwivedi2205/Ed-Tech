"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  MessageCircleQuestion,
  BookOpen,
  X,
  Command,
} from "lucide-react";

interface MiniDronaProps {
  workspaceId: Id<"workspaces">;
  currentContentId?: Id<"content">;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; snippet: string }[];
}

export function MiniDrona({ workspaceId, currentContentId }: MiniDronaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const askQuestion = useAction(api.actions.miniDrona.askQuestion);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Text selection handler
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 10 && text.length < 1000) {
        // Get selection position for popup
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          setSelectedText(text);
          setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
          setShowPopup(true);
        }
      } else {
        setShowPopup(false);
      }
    };

    // Debounce selection handler
    let timeout: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleSelection, 300);
    };

    document.addEventListener("mouseup", debouncedHandler);
    document.addEventListener("keyup", debouncedHandler);

    return () => {
      document.removeEventListener("mouseup", debouncedHandler);
      document.removeEventListener("keyup", debouncedHandler);
      clearTimeout(timeout);
    };
  }, []);

  const handleAskAboutSelection = useCallback(() => {
    setQuestion(`Explain this: "${selectedText}"`);
    setShowPopup(false);
    setIsOpen(true);
  }, [selectedText]);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || isLoading) return;

    const userMessage = question.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const result = await askQuestion({
        workspaceId,
        question: userMessage,
        selectedText: selectedText || undefined,
        currentContentId,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
        },
      ]);
      setSelectedText(""); // Clear after using
    } catch (error) {
      console.error("Failed to get answer:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I encountered an error while processing your question. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [question, isLoading, askQuestion, workspaceId, selectedText, currentContentId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <>
      {/* Selection Popup */}
      {showPopup && (
        <div
          className="fixed z-[100] animate-in fade-in slide-in-from-bottom-2"
          style={{
            left: popupPosition.x,
            top: popupPosition.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <Button
            onClick={handleAskAboutSelection}
            className="gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-violet-700 hover:to-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            Ask Mini-Drona
          </Button>
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 p-0 shadow-xl transition-transform hover:scale-110 hover:from-violet-700 hover:to-purple-700"
        title="Ask Mini-Drona (Ctrl+K)"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex h-[600px] max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden p-0">
          {/* Header */}
          <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Mini-Drona
                </DialogTitle>
                <DialogDescription className="text-sm text-white/80">
                  Your AI learning assistant
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600">
                  <MessageCircleQuestion className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  How can I help you learn?
                </h3>
                <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Ask me anything about your learning content. I can explain concepts,
                  answer questions, and help you understand difficult topics.
                </p>
                <div className="grid gap-2">
                  <button
                    onClick={() =>
                      setQuestion("Can you summarize the key concepts from this topic?")
                    }
                    className="rounded-lg bg-white px-4 py-2 text-left text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:ring-violet-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-violet-600"
                  >
                    📝 Summarize key concepts
                  </button>
                  <button
                    onClick={() =>
                      setQuestion("Can you give me a practice problem to test my understanding?")
                    }
                    className="rounded-lg bg-white px-4 py-2 text-left text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:ring-violet-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-violet-600"
                  >
                    🎯 Give me a practice problem
                  </button>
                  <button
                    onClick={() =>
                      setQuestion("What are the most important things I should remember?")
                    }
                    className="rounded-lg bg-white px-4 py-2 text-left text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:ring-violet-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-violet-600"
                  >
                    ⭐ Key takeaways
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                        msg.role === "user"
                          ? "bg-blue-600"
                          : "bg-gradient-to-br from-violet-500 to-purple-600"
                      )}
                    >
                      {msg.role === "user" ? (
                        <span className="text-sm font-medium text-white">You</span>
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                      )}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <BookOpen className="h-3 w-3" />
                            Sources
                          </p>
                          <div className="space-y-1">
                            {msg.sources.map((source, sIdx) => (
                              <div
                                key={sIdx}
                                className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              >
                                <span className="font-medium">{source.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your learning content..."
                  className="min-h-[44px] resize-none pr-12"
                  rows={1}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-slate-400">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!question.trim() || isLoading}
                className="h-[44px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
