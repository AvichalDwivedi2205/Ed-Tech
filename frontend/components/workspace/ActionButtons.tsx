"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

interface ActionButtonsProps {
  workspaceId: Id<"workspaces">;
  onRoadmapGenerated?: () => void;
}

export function ActionButtons({ workspaceId, onRoadmapGenerated }: ActionButtonsProps) {
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const startGeneration = useAction(api.actions.roadmap.startGeneration);
  const continueGeneration = useAction(api.actions.roadmap.continueGeneration);
  const [generationId, setGenerationId] = useState<Id<"roadmapGenerations"> | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState("");

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const userInput = prompt("Enter a topic or learning goal for your roadmap:");
      if (!userInput || !userInput.trim()) {
        setIsGeneratingRoadmap(false);
        return;
      }

      const result = await startGeneration({
        workspaceId,
        userInput: userInput.trim(),
      });

      setGenerationId(result.generationId);
      setClarificationQuestion(result.clarificationQuestion);
      
      // Ask for clarification answer
      const userAnswer = prompt(result.clarificationQuestion + "\n\nYour answer:");
      if (!userAnswer || !userAnswer.trim()) {
        setIsGeneratingRoadmap(false);
        return;
      }

      // Continue generation with user's answer
      await continueGeneration({
        generationId: result.generationId,
        userAnswer: userAnswer.trim(),
      });
      
      if (onRoadmapGenerated) {
        onRoadmapGenerated();
      }
      
      alert("Roadmap generation started! This may take a few minutes. Check back soon.");
    } catch (error: any) {
      console.error("Failed to generate roadmap:", error);
      alert(`Failed to generate roadmap: ${error.message}`);
    } finally {
      setIsGeneratingRoadmap(false);
      setGenerationId(null);
      setClarificationQuestion("");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleGenerateRoadmap}
        disabled={isGeneratingRoadmap}
        className="flex items-center gap-2"
      >
        {isGeneratingRoadmap ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Generate Roadmap
          </>
        )}
      </Button>
    </div>
  );
}





