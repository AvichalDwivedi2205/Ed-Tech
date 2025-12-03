"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { QuizViewer } from "@/components/quiz/QuizViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import Link from "next/link";

export default function QuizPage() {
  const params = useParams();
  const quizId = params.quizId as Id<"quizzes">;
  const workspaceId = params.id as Id<"workspaces">;

  const quiz = useQuery(api.queries.quizzes.getQuiz, {
    quizId,
  });

  if (quiz === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (quiz === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">Quiz not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Extract questions from quizData
  const quizData = quiz.quizData || {};
  const questions = quizData.questions || [];

  if (questions.length === 0) {
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
              <p className="text-slate-600 dark:text-slate-400">No questions in this quiz</p>
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
        <div>
          <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Quiz: {quiz.subtopicId}
          </h1>
          <QuizViewer questions={questions} title={`Quiz: ${quiz.subtopicId}`} />
        </div>
      </div>
    </div>
  );
}

