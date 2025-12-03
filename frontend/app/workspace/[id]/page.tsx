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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Skeleton className="h-8 w-48" />
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (workspace === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link href="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Workspace not found
              </p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {workspace.name}
              </h1>
              {workspace.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
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
          <TabsList className="mb-6">
            <TabsTrigger value="roadmaps" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Roadmaps ({roadmaps?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content ({content?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Flashcards ({flashcards?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Quizzes ({quizzes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Documents
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

  if (roadmaps.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              No roadmaps yet
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
              Generate a roadmap to get started
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Roadmap
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

  return (
    <>
      <div>
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Generate Roadmap
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap._id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{roadmap.title || "Untitled Roadmap"}</CardTitle>
                <CardDescription>
                  Created {new Date(roadmap.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/workspace/${workspaceId}/roadmaps/${roadmap._id}`}>
                  <Button variant="outline" className="w-full">View Roadmap</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <GenerateRoadmapDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workspaceId={workspaceId}
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

