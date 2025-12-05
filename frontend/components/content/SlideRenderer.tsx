"use client";

import { useState, useCallback, useEffect } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Lightbulb,
  HelpCircle,
  PenTool,
  CheckCircle,
  Grid3X3,
  Maximize2,
  Minimize2,
} from "lucide-react";

export interface SlideContent {
  pageNumber: number;
  type: "theory" | "example" | "question" | "exercise" | "summary";
  title: string;
  content: string;
  notes?: string;
}

interface SlideRendererProps {
  slides: SlideContent[];
  topicTitle?: string;
  className?: string;
  onSlideChange?: (slideIndex: number) => void;
}

// Slide type icons and colors
const slideTypeConfig = {
  theory: {
    icon: BookOpen,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "Theory",
  },
  example: {
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    label: "Example",
  },
  question: {
    icon: HelpCircle,
    color: "from-purple-500 to-pink-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    label: "Practice",
  },
  exercise: {
    icon: PenTool,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    label: "Exercise",
  },
  summary: {
    icon: CheckCircle,
    color: "from-slate-500 to-slate-700",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-700",
    label: "Summary",
  },
};

export function SlideRenderer({
  slides,
  topicTitle,
  className,
  onSlideChange,
}: SlideRendererProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentSlide(index);
        onSlideChange?.(index);
        setShowGrid(false);
      }
    },
    [totalSlides, onSlideChange]
  );

  const goNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with text input or Ctrl+K
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Home":
          e.preventDefault();
          goToSlide(0);
          break;
        case "End":
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case "g":
          e.preventDefault();
          setShowGrid((prev) => !prev);
          break;
        case "Escape":
          if (showGrid) {
            setShowGrid(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, goToSlide, totalSlides, showGrid]);

  if (!slides || slides.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-slate-500">No slides available</p>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const config = slideTypeConfig[slide.type] || slideTypeConfig.theory;
  const Icon = config.icon;

  // Grid View
  if (showGrid) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            All Slides ({totalSlides})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(false)}
          >
            <Minimize2 className="mr-2 h-4 w-4" />
            Close Grid
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {slides.map((s, idx) => {
            const cfg = slideTypeConfig[s.type] || slideTypeConfig.theory;
            const SlideIcon = cfg.icon;
            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg",
                  idx === currentSlide
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      cfg.color
                    )}
                  >
                    <SlideIcon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Slide {idx + 1}
                  </span>
                </div>
                <h4 className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {s.title}
                </h4>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {s.content.substring(0, 100)}...
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Slide Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
              config.color
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {config.label} • Slide {currentSlide + 1} of {totalSlides}
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {slide.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGrid(true)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            title="View all slides (G)"
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn("h-full bg-gradient-to-r transition-all duration-300", config.color)}
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Slide Content */}
      <div
        className={cn(
          "min-h-[400px] rounded-2xl border-2 p-8 transition-all",
          config.borderColor,
          config.bgColor
        )}
      >
        <MarkdownRenderer content={slide.content} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {/* Slide Dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, idx) => {
            const dotConfig = slideTypeConfig[slides[idx].type] || slideTypeConfig.theory;
            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  idx === currentSlide
                    ? cn("w-8 bg-gradient-to-r", dotConfig.color)
                    : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>

        <Button
          variant="outline"
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard Hints */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500">
        Use <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-slate-700">←</kbd>{" "}
        <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-slate-700">→</kbd> to
        navigate •{" "}
        <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-slate-700">G</kbd> for
        grid view
      </div>
    </div>
  );
}
