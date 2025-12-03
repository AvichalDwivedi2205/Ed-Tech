"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { WorkspaceGrid } from "@/components/workspace/WorkspaceGrid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              OpenT
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              AI-Powered Learning Platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ConvexStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Workspaces
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Organize your learning materials and AI-generated content
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Workspace name..."
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <Button
              onClick={handleCreateWorkspace}
              disabled={isCreating || !workspaceName.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create Workspace"}
            </Button>
          </div>
        </div>

        <WorkspaceGrid workspaces={workspaces} isLoading={workspaces === undefined} />
      </main>
    </div>
  );
}
