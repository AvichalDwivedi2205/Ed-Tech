"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { SlideRenderer, SlideContent } from "@/components/content/SlideRenderer";
import { MiniDrona } from "@/components/ai/MiniDrona";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar, Clock, GraduationCap, Layers, FileText, HelpCircle, Loader2, Sparkles, RefreshCw, Globe, Database, Settings, ChevronDown, StickyNote } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ContentSource = "web" | "rag" | "both";

export default function ContentPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.contentId as Id<"content">;
  const workspaceId = params.id as Id<"workspaces">;
  const [viewMode, setViewMode] = useState<"slides" | "full">("slides");
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isRegeneratingContent, setIsRegeneratingContent] = useState(false);
  const [contentSource, setContentSource] = useState<ContentSource>("web");
  const [showSourceOptions, setShowSourceOptions] = useState(false);

  const generateFlashcards = useAction(api.actions.flashcard.generate);
  const generateQuiz = useAction(api.actions.quiz.generate);
  const generateNotes = useAction(api.actions.notes.generate);
  const generateContent = useAction(api.actions.content.generate);

  const content = useQuery(api.queries.content.getContent, {
    contentId,
  });

  // Check if there are indexed documents for RAG
  const documents = useQuery(
    api.queries.rag.listDocumentsByWorkspace,
    { workspaceId }
  );
  const hasIndexedDocuments = documents && documents.length > 0;

  const handleRegenerateContent = async () => {
    if (!content || isRegeneratingContent) return;
    
    setIsRegeneratingContent(true);
    setShowSourceOptions(false);
    try {
      await generateContent({
        workspaceId,
        subtopicId: content.subtopicId,
        settings: {
          useRag: contentSource === "rag" || contentSource === "both",
          useWebSearch: contentSource === "web" || contentSource === "both",
        },
      });
      // Content will auto-refresh via the query
    } catch (error: any) {
      console.error("Failed to regenerate content:", error);
      alert(`Failed to regenerate content: ${error.message}`);
    } finally {
      setIsRegeneratingContent(false);
    }
  };

  const getSourceLabel = (source: ContentSource) => {
    switch (source) {
      case "web": return "Web Search";
      case "rag": return "Your Documents";
      case "both": return "Both Sources";
    }
  };

  const getSourceIcon = (source: ContentSource) => {
    switch (source) {
      case "web": return <Globe className="h-4 w-4" />;
      case "rag": return <Database className="h-4 w-4" />;
      case "both": return <Settings className="h-4 w-4" />;
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!content || isGeneratingFlashcards) return;
    
    setIsGeneratingFlashcards(true);
    try {
      const result = await generateFlashcards({
        workspaceId,
        subtopicId: content.subtopicId,
        contentId,
        topicName: content.subtopicName || content.subtopicId,
      });
      
      if (result?.flashcardId) {
        router.push(`/workspace/${workspaceId}/flashcards/${result.flashcardId}`);
      }
    } catch (error: any) {
      console.error("Failed to generate flashcards:", error);
      alert(`Failed to generate flashcards: ${error.message}`);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!content || isGeneratingQuiz) return;
    
    setIsGeneratingQuiz(true);
    try {
      const result = await generateQuiz({
        workspaceId,
        subtopicId: content.subtopicId,
        contentId,
        topicName: content.subtopicName || content.subtopicId,
      });
      
      if (result?.quizId) {
        router.push(`/workspace/${workspaceId}/quizzes/${result.quizId}`);
      }
    } catch (error: any) {
      console.error("Failed to generate quiz:", error);
      alert(`Failed to generate quiz: ${error.message}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!content || isGeneratingNotes) return;
    
    setIsGeneratingNotes(true);
    try {
      const result = await generateNotes({
        workspaceId,
        subtopicId: content.subtopicId,
        contentId,
        topicName: content.subtopicName || content.subtopicId,
      });
      
      if (result?.notesId) {
        router.push(`/workspace/${workspaceId}/notes/${result.notesId}`);
      }
    } catch (error: any) {
      console.error("Failed to generate notes:", error);
      alert(`Failed to generate notes: ${error.message}`);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

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
  const slides = (content.slides || []) as SlideContent[];
  const hasSlides = slides.length > 0;

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
            {/* View Mode Toggle */}
            {hasSlides && (
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  onClick={() => setViewMode("slides")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    viewMode === "slides"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  )}
                >
                  <Layers className="h-4 w-4" />
                  Slides
                </button>
                <button
                  onClick={() => setViewMode("full")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    viewMode === "full"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Full
                </button>
              </div>
            )}
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
                {hasSlides && (
                  <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                    <Layers className="h-4 w-4" />
                    <span>{slides.length} slides</span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{wordCount.toLocaleString()} words</span>
                </div>
              </div>
              {/* Generate Flashcards and Quiz Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={handleGenerateFlashcards}
                  disabled={isGeneratingFlashcards || isGeneratingQuiz || isGeneratingNotes || isRegeneratingContent}
                  className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-0"
                >
                  {isGeneratingFlashcards ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Flashcards...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Flashcards
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingFlashcards || isGeneratingQuiz || isGeneratingNotes || isRegeneratingContent}
                  className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-0"
                >
                  {isGeneratingQuiz ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Generate Quiz
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGenerateNotes}
                  disabled={isGeneratingFlashcards || isGeneratingQuiz || isGeneratingNotes || isRegeneratingContent}
                  className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-0"
                >
                  {isGeneratingNotes ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Notes...
                    </>
                  ) : (
                    <>
                      <StickyNote className="mr-2 h-4 w-4" />
                      Quick Notes
                    </>
                  )}
                </Button>

                {/* Regenerate Content with Source Selection */}
                <div className="relative">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={handleRegenerateContent}
                      disabled={isGeneratingFlashcards || isGeneratingQuiz || isGeneratingNotes || isRegeneratingContent}
                      className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-0 rounded-r-none"
                    >
                      {isRegeneratingContent ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate Content
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowSourceOptions(!showSourceOptions)}
                      disabled={isGeneratingFlashcards || isGeneratingQuiz || isGeneratingNotes || isRegeneratingContent}
                      className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-0 rounded-l-none px-2"
                    >
                      {getSourceIcon(contentSource)}
                      <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${showSourceOptions ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                  
                  {showSourceOptions && (
                    <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-700">
                      <button
                        onClick={() => { setContentSource("web"); setShowSourceOptions(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-600 ${contentSource === "web" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        <Globe className="h-4 w-4" />
                        <span>Web Search Only</span>
                      </button>
                      <button
                        onClick={() => { setContentSource("rag"); setShowSourceOptions(false); }}
                        disabled={!hasIndexedDocuments}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-600 ${contentSource === "rag" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        <Database className="h-4 w-4" />
                        <span>Your Documents</span>
                        {!hasIndexedDocuments && <span className="ml-auto text-xs text-amber-500">No docs</span>}
                      </button>
                      <button
                        onClick={() => { setContentSource("both"); setShowSourceOptions(false); }}
                        disabled={!hasIndexedDocuments}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-600 ${contentSource === "both" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Both Sources</span>
                        {!hasIndexedDocuments && <span className="ml-auto text-xs text-amber-500">No docs</span>}
                      </button>
                    </div>
                  )}
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
            {hasSlides && viewMode === "slides" ? (
              <SlideRenderer 
                slides={slides} 
                topicTitle={content.subtopicName || content.subtopicId} 
              />
            ) : (
              <MarkdownRenderer content={markdown} />
            )}
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

      {/* Mini-Drona AI Assistant */}
      <MiniDrona workspaceId={workspaceId} currentContentId={contentId} />
    </div>
  );
}

