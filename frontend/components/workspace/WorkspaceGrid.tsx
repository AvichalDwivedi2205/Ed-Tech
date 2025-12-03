"use client";

import { WorkspaceCard } from "./WorkspaceCard";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus, Sparkles } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

interface Workspace {
  _id: Id<"workspaces">;
  _creationTime: number;
  name: string;
  description?: string;
  createdAt: number;
}

interface WorkspaceGridProps {
  workspaces: Workspace[] | undefined;
  isLoading?: boolean;
}

export function WorkspaceGrid({ workspaces, isLoading }: WorkspaceGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/30">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
          <FolderPlus className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
          No workspaces yet
        </h3>
        <p className="mt-2 max-w-sm text-slate-600 dark:text-slate-400">
          Create your first workspace above to start your learning journey
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <Sparkles className="h-4 w-4" />
          <span>AI-powered roadmaps await!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace._id}
          id={workspace._id}
          name={workspace.name}
          description={workspace.description}
          createdAt={workspace.createdAt}
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 dark:border-slate-700/80 dark:bg-slate-800/80">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="mt-4 h-10 w-full rounded-md" />
    </div>
  );
}

