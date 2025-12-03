"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { motion } from "framer-motion";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
}

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">No flashcards available</p>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < flashcards.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress indicator */}
      <div className="w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span>{Math.round(((currentIndex + 1) / flashcards.length) * 100)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative h-96 w-full max-w-2xl perspective-1000">
        <motion.div
          className="relative h-full w-full preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <Card
            className={`absolute inset-0 h-full w-full backface-hidden ${
              isFlipped ? "opacity-0" : "opacity-100"
            }`}
            style={{ transform: "rotateY(0deg)" }}
          >
            <CardContent className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Question
                </p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {currentCard.front}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className={`absolute inset-0 h-full w-full backface-hidden ${
              isFlipped ? "opacity-100" : "opacity-0"
            }`}
            style={{ transform: "rotateY(180deg)" }}
          >
            <CardContent className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Answer
                </p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {currentCard.back}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={!canGoPrev}
          size="icon"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button onClick={handleFlip} variant="default" className="min-w-[120px]">
          <RotateCw className="mr-2 h-4 w-4" />
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={!canGoNext}
          size="icon"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

