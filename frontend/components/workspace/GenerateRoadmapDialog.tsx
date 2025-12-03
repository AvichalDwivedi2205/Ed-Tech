"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

interface GenerateRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: Id<"workspaces">;
  onSuccess?: () => void;
}

export function GenerateRoadmapDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: GenerateRoadmapDialogProps) {
  const [userInput, setUserInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [generationId, setGenerationId] = useState<Id<"roadmapGenerations"> | null>(null);

  const startGeneration = useAction(api.actions.roadmap.startGeneration);
  const continueGeneration = useAction(api.actions.roadmap.continueGeneration);

  // Check for active generation when dialog opens
  const activeGeneration = useQuery(
    api.queries.roadmapGenerations.getActiveGeneration,
    open ? { workspaceId } : "skip"
  );

  useEffect(() => {
    if (activeGeneration && activeGeneration.status === "clarifying") {
      setGenerationId(activeGeneration._id);
      // Get the last AI message as the clarification question
      const lastAIMessage = activeGeneration.messages
        .filter((msg: any) => msg.type === "AIMessage")
        .pop();
      if (lastAIMessage) {
        setClarificationQuestion(lastAIMessage.content);
      }
      setUserInput(activeGeneration.userInput);
    }
  }, [activeGeneration]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isStarting) return;

    setIsStarting(true);
    try {
      const result = await startGeneration({
        workspaceId,
        userInput: userInput.trim(),
      });

      setGenerationId(result.generationId);
      setClarificationQuestion(result.clarificationQuestion);
    } catch (error: any) {
      console.error("Failed to start roadmap generation:", error);
      alert(`Failed to start: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !generationId || isGenerating) return;

    setIsGenerating(true);
    try {
      await continueGeneration({
        generationId,
        userAnswer: userAnswer.trim(),
      });

      setUserInput("");
      setUserAnswer("");
      setClarificationQuestion("");
      setGenerationId(null);
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
      alert("Roadmap generation started! This may take 2-5 minutes. Refresh the page to see it when ready.");
    } catch (error: any) {
      console.error("Failed to generate roadmap:", error);
      alert(`Failed to generate roadmap: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setUserInput("");
    setUserAnswer("");
    setClarificationQuestion("");
    setGenerationId(null);
    onOpenChange(false);
  };

  // Show clarification step if we have a question
  const showClarification = clarificationQuestion && generationId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {showClarification ? "Answer Clarification Question" : "Generate Learning Roadmap"}
          </DialogTitle>
          <DialogDescription>
            {showClarification
              ? "Please answer the question below to help us create a personalized roadmap for you."
              : "Describe what you want to learn. Our AI will ask a clarifying question, then create a structured learning roadmap."}
          </DialogDescription>
        </DialogHeader>

        {showClarification ? (
          <form onSubmit={handleContinue}>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      AI Question:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {clarificationQuestion}
                    </p>
                  </div>
                </div>
              </div>
              <Textarea
                placeholder="Type your answer here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!userAnswer.trim() || isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Roadmap
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleStart}>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="e.g., Learn machine learning fundamentals, Master Python programming, Understand web development..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isStarting}
                autoFocus
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Be as specific as possible. The AI will ask you a clarifying question before generating the roadmap.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isStarting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!userInput.trim() || isStarting}>
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
