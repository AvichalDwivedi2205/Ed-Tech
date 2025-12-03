"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { RoadmapFlow } from "@/components/roadmap/RoadmapFlow";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, GraduationCap, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import Link from "next/link";

export default function RoadmapPage() {
  const params = useParams();
  const roadmapId = params.roadmapId as Id<"roadmaps">;
  const workspaceId = params.id as Id<"workspaces">;

  const roadmap = useQuery(api.queries.roadmaps.getRoadmap, {
    roadmapId,
  });

  if (roadmap === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (roadmap === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <GraduationCap className="mx-auto h-16 w-16 text-slate-400" />
              <h3 className="mt-4 text-xl font-semibold text-slate-600 dark:text-slate-400">
                Roadmap not found
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-500">
                This roadmap may have been deleted or doesn&apos;t exist.
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

  const roadmapData = roadmap.roadmapData || roadmap.roadmapJson || {};
  const title = roadmapData.RoadmapTitle || roadmapData.title || roadmap.title || "Learning Roadmap";
  const teachingStyle = roadmapData.TeachingStyle || roadmap.teachingStyle;

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
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
                {title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(roadmap.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                {teachingStyle && (
                  <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{teachingStyle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Flow */}
        <div className="rounded-3xl bg-white/50 p-6 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-sm dark:bg-slate-900/50 dark:ring-slate-700/50 lg:p-8">
          <RoadmapFlow roadmapData={roadmapData} />
        </div>
      </div>
    </div>
  );
}

