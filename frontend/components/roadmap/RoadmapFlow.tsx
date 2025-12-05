"use client";

import { useMemo, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { RoadmapNode } from "./RoadmapNode";
import { LayoutGrid, ArrowDown, Sparkles, Loader2, CheckCircle2, FastForward, Globe, Database, Settings, ChevronDown } from "lucide-react";

type ContentSource = "web" | "rag" | "both";

interface RoadmapFlowProps {
  roadmapData: any;
  workspaceId?: Id<"workspaces">;
  roadmapId?: Id<"roadmaps">;
}

export function RoadmapFlow({ roadmapData, workspaceId, roadmapId }: RoadmapFlowProps) {
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [contentSource, setContentSource] = useState<ContentSource>("web");
  const [showSourceOptions, setShowSourceOptions] = useState(false);

  // Content generation action
  const generateContent = useAction(api.actions.content.generate);

  // Query all content for this workspace to determine which topics have content
  const allContent = useQuery(
    api.queries.content.listContent,
    workspaceId ? { workspaceId } : "skip"
  );

  // Check if there are indexed documents for RAG
  const documents = useQuery(
    api.queries.rag.listDocumentsByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  );
  const hasIndexedDocuments = documents && documents.length > 0;

  // Extract topics
  const topics = useMemo(() => {
    if (!roadmapData || typeof roadmapData !== "object") {
      return [];
    }
    return Object.keys(roadmapData).filter(
      (key) => key !== "TeachingStyle" && key !== "title" && key !== "RoadmapTitle" && roadmapData[key]?.TopicName
    );
  }, [roadmapData]);

  // Build topic data for rendering
  const topicData = useMemo(() => {
    return topics.map((topicId, topicIndex) => {
      const topic = roadmapData[topicId];
      const topicName = topic?.TopicName || topicId;
      const contentList = topic?.ContentList || {};
      const subtopics = contentList?.topics || [];
      const videos = contentList?.videos || [];
      const blogs = contentList?.blogs || [];
      const books = contentList?.books || [];
      const suggestedTime = topic?.SuggestedTimeToComplete;

      return {
        id: topicId,
        topicName,
        suggestedTime,
        videos,
        blogs,
        books,
        subtopics,
        topicIndex: topicIndex + 1,
        totalTopics: topics.length,
      };
    });
  }, [roadmapData, topics]);

  // Find topics that already have content
  const completedTopicIds = useMemo(() => {
    if (!allContent) return new Set<string>();
    return new Set(allContent.map((c) => c.subtopicId));
  }, [allContent]);

  // Find next topic without content
  const nextTopicToGenerate = useMemo(() => {
    return topicData.find((topic) => !completedTopicIds.has(topic.id));
  }, [topicData, completedTopicIds]);

  // Progress stats
  const completedCount = topicData.filter((t) => completedTopicIds.has(t.id)).length;
  const totalCount = topicData.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  // Handle Generate Next
  const handleGenerateNext = async () => {
    if (!workspaceId || !nextTopicToGenerate) return;

    setIsGeneratingNext(true);
    setGeneratingTopicId(nextTopicToGenerate.id);
    setShowSourceOptions(false);

    try {
      await generateContent({
        workspaceId,
        roadmapId,
        subtopicId: nextTopicToGenerate.id,
        settings: {
          useRag: contentSource === "rag" || contentSource === "both",
          useWebSearch: contentSource === "web" || contentSource === "both",
        },
      });
    } catch (err) {
      console.error("Content generation failed:", err);
    } finally {
      setIsGeneratingNext(false);
      setGeneratingTopicId(null);
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

  if (topicData.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <LayoutGrid className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" />
          <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-400">No roadmap data available</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Generate a roadmap to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Progress and Generate Next Button */}
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        {/* Progress Stats */}
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 px-4 py-2 text-sm font-medium text-slate-700 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 dark:text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
              {topics.length}
            </span>
            Topics in your learning path
          </span>
          
          {/* Content Progress */}
          {workspaceId && (
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
              <CheckCircle2 className={`h-4 w-4 ${allCompleted ? 'text-green-500' : 'text-slate-400'}`} />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {completedCount}/{totalCount} generated
              </span>
            </div>
          )}
        </div>

        {/* Generate Next Section with Source Selection */}
        {workspaceId && nextTopicToGenerate && (
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            {/* Source Selection Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSourceOptions(!showSourceOptions)}
                disabled={isGeneratingNext}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {getSourceIcon(contentSource)}
                <span>{getSourceLabel(contentSource)}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showSourceOptions ? "rotate-180" : ""}`} />
              </button>
              
              {showSourceOptions && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-700">
                  <button
                    onClick={() => { setContentSource("web"); setShowSourceOptions(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-600 ${contentSource === "web" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}
                  >
                    <Globe className="h-4 w-4" />
                    <span>Web Search Only</span>
                    <span className="ml-auto text-xs text-slate-400">Default</span>
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

            {/* Generate Button */}
            <button
              onClick={handleGenerateNext}
              disabled={isGeneratingNext}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGeneratingNext ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FastForward className="h-4 w-4" />
                  <span>Generate Next: {nextTopicToGenerate.topicName.substring(0, 20)}{nextTopicToGenerate.topicName.length > 20 ? '...' : ''}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* All Complete Badge */}
        {workspaceId && allCompleted && (
          <div className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>All content generated!</span>
          </div>
        )}
      </div>

      {/* Flowchart - Simple vertical list with connectors */}
      <div className="flex flex-col items-center gap-0">
        {topicData.map((data, index) => {
          const isNext = nextTopicToGenerate?.id === data.id;
          const isCurrentlyGenerating = isGeneratingNext && generatingTopicId === data.id;
          
          return (
            <div key={data.id} className="flex flex-col items-center w-full max-w-2xl">
              {/* Topic Card */}
              <div className="w-full">
                <RoadmapNode 
                  data={data}
                  topicId={data.id}
                  workspaceId={workspaceId}
                  roadmapId={roadmapId}
                  isNextToGenerate={isNext}
                  isGenerating={isCurrentlyGenerating}
                />
              </div>
              
              {/* Connector Arrow (not on last item) */}
              {index < topicData.length - 1 && (
                <div className="flex flex-col items-center py-3">
                  <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 to-purple-400 dark:from-purple-400 dark:to-purple-500" />
                  <ArrowDown className="h-5 w-5 text-purple-500 dark:text-purple-400 -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Completion indicator */}
      {topicData.length > 0 && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
            🎉 End of Roadmap
          </div>
        </div>
      )}
    </div>
  );
}
