"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Lightbulb, Code, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface ShortNote {
  id: string;
  title: string;
  keyPoints: string[];
  summary: string;
  formula?: string;
  example?: string;
  tags?: string[];
}

interface ShortNotesViewerProps {
  notes: ShortNote[];
  title?: string;
}

export function ShortNotesViewer({ notes, title }: ShortNotesViewerProps) {
  const [currentNote, setCurrentNote] = useState(0);

  if (!notes || notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">No notes available</p>
        </CardContent>
      </Card>
    );
  }

  const note = notes[currentNote];

  const goNext = () => {
    if (currentNote < notes.length - 1) {
      setCurrentNote(currentNote + 1);
    }
  };

  const goPrev = () => {
    if (currentNote > 0) {
      setCurrentNote(currentNote - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {title && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quick Study Notes
          </p>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>Note {currentNote + 1} of {notes.length}</span>
        <div className="flex gap-1">
          {notes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentNote(idx)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                idx === currentNote
                  ? "bg-blue-600 w-4"
                  : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
              )}
            />
          ))}
        </div>
      </div>

      {/* Note Card */}
      <Card className="overflow-hidden border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {note.title}
            </CardTitle>
            {note.tags && note.tags.length > 0 && (
              <div className="flex gap-1">
                {note.tags.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-white/20 px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Summary */}
          <div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {note.summary}
            </p>
          </div>

          {/* Key Points */}
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Key Points
            </h4>
            <ul className="space-y-2">
              {note.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Formula */}
          {note.formula && (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                <span className="text-lg">∑</span>
                Formula
              </h4>
              <div className="text-center py-2 prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {note.formula}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Example */}
          {note.example && (
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Example
              </h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-mono">
                {note.example}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentNote === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={currentNote === notes.length - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {notes.map((n, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentNote(idx)}
            className={cn(
              "p-2 rounded-lg text-xs text-left transition-all",
              idx === currentNote
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-500"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            )}
          >
            <span className="font-medium line-clamp-1">{n.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
