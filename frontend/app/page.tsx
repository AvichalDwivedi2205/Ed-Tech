"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { WorkspaceGrid } from "@/components/workspace/WorkspaceGrid";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import { useState } from "react";

export default function Home() {
  const workspaces = useQuery(api.queries.workspaces.listWorkspaces, {});
  const createWorkspace = useMutation(api.mutations.workspaces.createWorkspace);
  const [isCreating, setIsCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setIsCreating(true);
    try {
      await createWorkspace({
        name: workspaceName.trim(),
        description: "",
      });
      setWorkspaceName("");
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                OpenT
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI-Powered Learning
              </p>
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
        {/* Hero Section */}
        <div className="mb-10 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl lg:p-12">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI-Powered Learning</span>
              </div>
              <h2 className="text-3xl font-bold leading-tight lg:text-4xl">
                Your Personal Learning Journey Starts Here
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Create workspaces for different topics, generate personalized roadmaps, 
                and master any subject with AI-generated content, flashcards, and quizzes.
              </p>
            </div>
          </div>
          
          {/* Create Workspace Form */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Enter a topic (e.g., Machine Learning, Web Development...)"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              className="flex-1 rounded-xl border-2 border-white/20 bg-white/10 px-5 py-3.5 text-white placeholder-white/60 backdrop-blur-sm transition-all focus:border-white/40 focus:outline-none focus:ring-0"
            />
            <Button
              onClick={handleCreateWorkspace}
              disabled={isCreating || !workspaceName.trim()}
              size="lg"
              className="bg-white px-8 text-indigo-700 shadow-lg transition-all hover:bg-white/90 hover:shadow-xl disabled:opacity-50"
            >
              <Plus className="mr-2 h-5 w-5" />
              {isCreating ? "Creating..." : "Create Workspace"}
            </Button>
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Your Workspaces
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Each workspace contains a focused learning path with roadmaps, content, and practice materials
          </p>
        </div>

        <WorkspaceGrid workspaces={workspaces} isLoading={workspaces === undefined} />
      </main>
    </div>
  );
}
