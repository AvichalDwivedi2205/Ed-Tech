"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar, Clock, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import Link from "next/link";

export default function ContentPage() {
  const params = useParams();
  const contentId = params.contentId as Id<"content">;
  const workspaceId = params.id as Id<"workspaces">;

  const content = useQuery(api.queries.content.getContent, {
    contentId,
  });

  if (content === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <BookOpen className="mx-auto h-16 w-16 text-slate-400" />
              <h3 className="mt-4 text-xl font-semibold text-slate-600 dark:text-slate-400">
                Content not found
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-500">
                This content may have been deleted or doesn&apos;t exist.
              </p>
              <Link href={`/workspace/${workspaceId}`}>
                <Button className="mt-6" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Workspace
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const markdown = content.markdown || content.content || "";

  // Estimate reading time (average 200 words per minute)
  const wordCount = markdown.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href={`/workspace/${workspaceId}`}>
            <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Workspace</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <ConvexStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:border-slate-800">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
                {content.subtopicName || content.subtopicId || "Learning Content"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {new Date(content.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                  <Clock className="h-4 w-4" />
                  <span>{readingTime} min read</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{wordCount.toLocaleString()} words</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200/50 dark:bg-slate-900 dark:ring-slate-700/50 lg:p-12">
            <MarkdownRenderer content={markdown} />
          </div>
        </div>
      </div>

      {/* Back to top button */}
      <div className="container mx-auto px-4 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <Link href={`/workspace/${workspaceId}`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Workspace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

