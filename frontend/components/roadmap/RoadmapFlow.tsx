"use client";

import { useMemo } from "react";
import { RoadmapNode } from "./RoadmapNode";
import { LayoutGrid, ArrowDown } from "lucide-react";

interface RoadmapFlowProps {
  roadmapData: any;
}

export function RoadmapFlow({ roadmapData }: RoadmapFlowProps) {
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
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 px-4 py-2 text-sm font-medium text-slate-700 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 dark:text-slate-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
            {topics.length}
          </span>
          Topics in your learning path
        </span>
      </div>

      {/* Flowchart - Simple vertical list with connectors */}
      <div className="flex flex-col items-center gap-0">
        {topicData.map((data, index) => (
          <div key={data.id} className="flex flex-col items-center w-full max-w-2xl">
            {/* Topic Card */}
            <div className="w-full">
              <RoadmapNode 
                data={data}
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
        ))}
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
