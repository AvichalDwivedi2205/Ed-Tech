"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, FileText, Layers, HelpCircle, Database, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import { GenerateRoadmapDialog } from "@/components/workspace/GenerateRoadmapDialog";
import Link from "next/link";
import { useState } from "react";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as Id<"workspaces">;
  const [refreshKey, setRefreshKey] = useState(0);

  const workspace = useQuery(api.queries.workspaces.getWorkspace, {
    id: workspaceId,
  });

  const workspaceContent = useQuery(api.queries.workspaces.getWorkspaceContent, {
    workspaceId,
  });

  const handleRoadmapSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (workspace === undefined || workspaceContent === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full rounded-2xl mb-8" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (workspace === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Layers className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-600 dark:text-slate-400">
                Workspace not found
              </h3>
              <p className="mt-2 text-slate-500">
                This workspace may have been deleted or doesn&apos;t exist.
              </p>
              <Link href="/">
                <Button className="mt-6" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { roadmaps, content, quizzes, flashcards } = workspaceContent || {
    roadmaps: [],
    content: [],
    quizzes: [],
    flashcards: [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {workspace.name}
              </h1>
              {workspace.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {workspace.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConvexStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="roadmaps" className="w-full">
          <TabsList className="mb-8 inline-flex h-auto gap-1 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-slate-800/80">
            <TabsTrigger value="roadmaps" className="flex items-center gap-2 rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Roadmaps</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-600">
                {roadmaps?.length || 0}
              </span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2 rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Content</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-600">
                {content?.length || 0}
              </span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-2 rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Flashcards</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-600">
                {flashcards?.length || 0}
              </span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2 rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Quizzes</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-600">
                {quizzes?.length || 0}
              </span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roadmaps">
            <RoadmapsTab 
              roadmaps={roadmaps || []} 
              workspaceId={workspaceId}
              onRoadmapGenerated={handleRoadmapSuccess}
            />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab content={content || []} workspaceId={workspaceId} />
          </TabsContent>

          <TabsContent value="flashcards">
            <FlashcardsTab flashcards={flashcards || []} workspaceId={workspaceId} />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizzesTab quizzes={quizzes || []} workspaceId={workspaceId} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function RoadmapsTab({ 
  roadmaps, 
  workspaceId,
  onRoadmapGenerated 
}: { 
  roadmaps: any[]; 
  workspaceId: Id<"workspaces">;
  onRoadmapGenerated?: () => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Get the first (and should be only) roadmap
  const roadmap = roadmaps[0];
  const hasRoadmap = roadmaps.length > 0;

  // If there's already a roadmap, show it prominently
  if (hasRoadmap && roadmap) {
    const roadmapData = roadmap.roadmapData || {};
    const title = roadmapData.RoadmapTitle || roadmapData.title || roadmap.title || "Learning Roadmap";
    const teachingStyle = roadmapData.TeachingStyle || roadmap.teachingStyle;
    
    // Count topics
    const topicCount = Object.keys(roadmapData).filter(
      (key) => key !== "TeachingStyle" && key !== "title" && key !== "RoadmapTitle" && roadmapData[key]?.TopicName
    ).length;

    return (
      <div className="space-y-6">
        {/* Hero Card for the Roadmap */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl">
          {/* Decorative elements */}
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-white/5" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <Layers className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                    Your Learning Path
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold leading-tight lg:text-3xl">
                  {title}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-white/80">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>{topicCount} Topics</span>
                  </div>
                  {teachingStyle && (
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>{teachingStyle}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>•</span>
                    <span>Created {new Date(roadmap.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href={`/workspace/${workspaceId}/roadmaps/${roadmap._id}`}>
                <Button 
                  size="lg" 
                  className="bg-white text-indigo-700 hover:bg-white/90 shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 rotate-180" />
                  Open Roadmap
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/20">
          <CardContent className="flex items-start gap-4 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/50">
              <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">One Roadmap Per Workspace</h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Each workspace is designed for focused learning with a single comprehensive roadmap. 
                Create a new workspace if you want to explore a different topic.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No roadmap yet - show empty state with generate button
  return (
    <>
      <Card className="border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800/50">
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Layers className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Start Your Learning Journey
          </h3>
          <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-slate-400">
            Generate a personalized learning roadmap tailored to your goals, 
            skill level, and preferred learning style.
          </p>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            size="lg" 
            className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-5 w-5" />
            Generate Your Roadmap
          </Button>
        </CardContent>
      </Card>
      <GenerateRoadmapDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workspaceId={workspaceId}
        onSuccess={onRoadmapGenerated}
      />
    </>
  );
}

function ContentTab({ content, workspaceId }: { content: any[]; workspaceId: Id<"workspaces"> }) {
  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold">No content yet</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Generate content from a roadmap
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {content.map((item) => (
        <Card key={item._id} className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>{item.subtopicName || item.subtopicId}</CardTitle>
            <CardDescription>
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/workspace/${workspaceId}/content/${item._id}`}>
              <Button variant="outline" className="w-full">View Content</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FlashcardsTab({ flashcards, workspaceId }: { flashcards: any[]; workspaceId: Id<"workspaces"> }) {
  if (flashcards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold">No flashcards yet</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Generate flashcards from content
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {flashcards.map((flashcard) => (
        <Card key={flashcard._id} className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Flashcards: {flashcard.subtopicId}</CardTitle>
            <CardDescription>
              Created {new Date(flashcard.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/workspace/${workspaceId}/flashcards/${flashcard._id}`}>
              <Button variant="outline" className="w-full">Study Flashcards</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuizzesTab({ quizzes, workspaceId }: { quizzes: any[]; workspaceId: Id<"workspaces"> }) {
  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold">No quizzes yet</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Generate quizzes from content
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz) => (
        <Card key={quiz._id} className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Quiz: {quiz.subtopicId}</CardTitle>
            <CardDescription>
              Created {new Date(quiz.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/workspace/${workspaceId}/quizzes/${quiz._id}`}>
              <Button variant="outline" className="w-full">Take Quiz</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DocumentsTab({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const documents = useQuery(api.queries.rag.listDocumentsByWorkspace, {
    workspaceId,
  });

  if (documents === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Database className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold">No documents indexed</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Upload documents to use RAG for content generation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc: any) => (
        <Card key={doc._id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{doc.title}</CardTitle>
                <CardDescription>
                  {doc.pageCount} pages • {doc.ragNamespace}
                </CardDescription>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  doc.status === "indexed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : doc.status === "pending"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {doc.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Indexed {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

