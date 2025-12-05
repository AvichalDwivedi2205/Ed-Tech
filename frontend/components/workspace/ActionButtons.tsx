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
  const generateRoadmap = useAction(api.actions.roadmap.generate);

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const userInput = prompt("Enter a topic or learning goal for your roadmap:");
      if (!userInput || !userInput.trim()) {
        setIsGeneratingRoadmap(false);
        return;
      }

      await generateRoadmap({
        workspaceId,
        userInput: userInput.trim(),
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





