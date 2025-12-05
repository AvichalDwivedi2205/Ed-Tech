"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { CheckCircle2, XCircle } from "lucide-react";

export function ConvexStatus() {
  // Try to query workspaces to test connection
  const workspaces = useQuery(api.queries.workspaces.listWorkspaces, {});
  
  if (workspaces === undefined) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        Connecting...
      </div>
    );
  }

  if (workspaces === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500">
        <XCircle className="h-3 w-3" />
        Not Connected
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3" />
      Connected
    </div>
  );
}





