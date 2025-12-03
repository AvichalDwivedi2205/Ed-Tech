"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { FlashcardViewer } from "@/components/flashcard/FlashcardViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import Link from "next/link";

export default function FlashcardPage() {
  const params = useParams();
  const flashcardId = params.flashcardId as Id<"flashcards">;
  const workspaceId = params.id as Id<"workspaces">;

  const flashcard = useQuery(api.queries.flashcards.getFlashcard, {
    flashcardId,
  });

  if (flashcard === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (flashcard === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">Flashcard set not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Extract flashcards from flashcardData
  const flashcardData = flashcard.flashcardData || {};
  const cards = flashcardData.cards || [];

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link href={`/workspace/${workspaceId}`}>
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <ConvexStatus />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">No flashcards in this set</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href={`/workspace/${workspaceId}`}>
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workspace
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <ConvexStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Flashcards: {flashcard.subtopicId}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Created {new Date(flashcard.createdAt).toLocaleDateString()}
            </p>
          </div>
          <CardContent className="p-0">
            <FlashcardViewer flashcards={cards} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

