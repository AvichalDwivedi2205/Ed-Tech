"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import { 
  ChevronDown, 
  ChevronUp, 
  Video, 
  BookOpen, 
  FileText, 
  ExternalLink, 
  Clock, 
  Target, 
  ListChecks,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw
} from "lucide-react";

interface RoadmapNodeProps {
  data: {
    topicName: string;
    suggestedTime?: string;
    videos?: Array<{ title: string; url: string; description: string }>;
    blogs?: Array<{ title: string; url: string; description: string }>;
    books?: Array<{ title: string; author: string; description: string }>;
    subtopics?: string[];
    topicIndex?: number;
    totalTopics?: number;
  };
  topicId?: string;
  workspaceId?: Id<"workspaces">;
  roadmapId?: Id<"roadmaps">;
}

export function RoadmapNode({ data, topicId, workspaceId, roadmapId }: RoadmapNodeProps) {
  const [expandedSections, setExpandedSections] = useState<{
    videos: boolean;
    blogs: boolean;
    books: boolean;
    subtopics: boolean;
  }>({
    videos: false,
    blogs: false,
    books: false,
    subtopics: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  // Query existing content for this topic
  const existingContent = useQuery(
    api.queries.content.getContentBySubtopic,
    workspaceId && topicId
      ? { workspaceId, subtopicId: topicId }
      : "skip"
  );

  // Content generation action
  const generateContent = useAction(api.actions.content.generate);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleGenerateContent = async () => {
    if (!workspaceId || !topicId) {
      setError("Missing workspace or topic information");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await generateContent({
        workspaceId,
        roadmapId,
        subtopicId: topicId,
        settings: {
          useRag: false,
          useWebSearch: true,
        },
      });
      setJustGenerated(true);
      // Clear the just generated state after a few seconds
      setTimeout(() => setJustGenerated(false), 3000);
    } catch (err: any) {
      console.error("Content generation failed:", err);
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const videoCount = data.videos?.length || 0;
  const blogCount = data.blogs?.length || 0;
  const bookCount = data.books?.length || 0;
  const subtopicCount = data.subtopics?.length || 0;

  const hasContent = !!existingContent;
  const canGenerate = workspaceId && topicId && !hasContent && !isGenerating;

  return (
    <div
      className={`group relative rounded-2xl border-2 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:bg-slate-800 ${
        hasContent 
          ? "border-green-300 dark:border-green-600" 
          : "border-slate-200 hover:border-blue-400 dark:border-slate-600 dark:hover:border-blue-500"
      }`}
    >
      {/* Content Status Badge */}
      {hasContent && (
        <div className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Header with Gradient */}
      <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-4 dark:border-slate-700">
        {/* Decorative Elements */}
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
        
        {/* Topic Number Badge */}
        {data.topicIndex && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
            <Target className="h-3 w-3 text-white/90" />
            <span className="text-xs font-semibold text-white">
              {data.topicIndex}/{data.totalTopics || '?'}
            </span>
          </div>
        )}
        
        <h3 className="pr-14 text-base font-bold leading-tight text-white drop-shadow-sm">
          {data.topicName}
        </h3>
        
        {data.suggestedTime && (
          <div className="mt-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-white/80" />
            <span className="text-xs font-medium text-white/80">
              {data.suggestedTime}
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="flex items-center justify-around border-b border-slate-100 bg-slate-50/80 px-2 py-2 dark:border-slate-700 dark:bg-slate-800/50">
        {subtopicCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <ListChecks className="h-3.5 w-3.5 text-emerald-500" />
            <span>{subtopicCount} topics</span>
          </div>
        )}
        {videoCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <Video className="h-3.5 w-3.5 text-red-500" />
            <span>{videoCount}</span>
          </div>
        )}
        {blogCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <FileText className="h-3.5 w-3.5 text-emerald-500" />
            <span>{blogCount}</span>
          </div>
        )}
        {bookCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <BookOpen className="h-3.5 w-3.5 text-violet-500" />
            <span>{bookCount}</span>
          </div>
        )}
      </div>

      {/* Content Generation Section */}
      {workspaceId && topicId && (
        <div className="border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-blue-50/50 px-3 py-3 dark:border-slate-700 dark:from-purple-900/20 dark:to-blue-900/20">
          {isGenerating ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Generating content...
                </p>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                  This may take a minute
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Generation failed
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 line-clamp-1">
                  {error}
                </p>
              </div>
              <button
                onClick={handleGenerateContent}
                className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : justGenerated ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Content generated successfully!
                </p>
              </div>
            </div>
          ) : hasContent ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Content ready
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">
                  Study material available
                </p>
              </div>
              <Link
                href={`/workspace/${workspaceId}/content/${existingContent._id}`}
                className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
              >
                <Eye className="h-3 w-3" />
                View Content
              </Link>
            </div>
          ) : (
            <button
              onClick={handleGenerateContent}
              disabled={!canGenerate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Generate Content
            </button>
          )}
        </div>
      )}

      {/* Content - Collapsible Sections */}
      <div className="max-h-[350px] overflow-y-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        
        {/* Subtopics Section - Click to expand */}
        {data.subtopics && data.subtopics.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => toggleSection("subtopics")}
              className="flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 text-left transition-all hover:from-emerald-100 hover:to-green-100 dark:from-emerald-900/30 dark:to-green-900/20 dark:hover:from-emerald-900/40 dark:hover:to-green-900/30"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <ListChecks className="h-4 w-4" />
                Subtopics ({data.subtopics.length})
              </span>
              {expandedSections.subtopics ? (
                <ChevronUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-emerald-500" />
              )}
            </button>
            {expandedSections.subtopics && (
              <div className="mt-2 space-y-1.5 pl-1">
                {data.subtopics.map((subtopic, idx) => {
                  const isProject = subtopic.includes("**PROJECT") || subtopic.includes("PROJECT");
                  const cleanName = subtopic.replace(/\*\*/g, "");
                  
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs ${
                        isProject 
                          ? "bg-amber-50 dark:bg-amber-900/20" 
                          : "bg-slate-50/80 dark:bg-slate-700/30"
                      }`}
                    >
                      <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isProject 
                          ? "bg-amber-200 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300" 
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`leading-snug ${
                        isProject 
                          ? "font-medium text-amber-800 dark:text-amber-200" 
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {cleanName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Videos Section */}
        {data.videos && data.videos.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => toggleSection("videos")}
              className="flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-red-50 to-rose-50 px-3 py-2 text-left transition-all hover:from-red-100 hover:to-rose-100 dark:from-red-900/30 dark:to-rose-900/20 dark:hover:from-red-900/40 dark:hover:to-rose-900/30"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                <Video className="h-4 w-4" />
                Videos ({data.videos.length})
              </span>
              {expandedSections.videos ? (
                <ChevronUp className="h-4 w-4 text-red-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-red-500" />
              )}
            </button>
            {expandedSections.videos && (
              <div className="mt-2 space-y-1.5">
                {data.videos.map((video, idx) => (
                  <a
                    key={idx}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link block rounded-lg border border-red-100 bg-white p-2 transition-all hover:border-red-300 hover:shadow-sm dark:border-red-800/50 dark:bg-slate-800/50 dark:hover:border-red-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 group-hover/link:text-red-600 dark:text-slate-200 dark:group-hover/link:text-red-400 line-clamp-2">
                        {video.title}
                      </p>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-red-400 opacity-0 transition-opacity group-hover/link:opacity-100" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blogs Section */}
        {data.blogs && data.blogs.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => toggleSection("blogs")}
              className="flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-left transition-all hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20 dark:hover:from-emerald-900/40 dark:hover:to-teal-900/30"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <FileText className="h-4 w-4" />
                Blogs ({data.blogs.length})
              </span>
              {expandedSections.blogs ? (
                <ChevronUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-emerald-500" />
              )}
            </button>
            {expandedSections.blogs && (
              <div className="mt-2 space-y-1.5">
                {data.blogs.map((blog, idx) => (
                  <a
                    key={idx}
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link block rounded-lg border border-emerald-100 bg-white p-2 transition-all hover:border-emerald-300 hover:shadow-sm dark:border-emerald-800/50 dark:bg-slate-800/50 dark:hover:border-emerald-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 group-hover/link:text-emerald-600 dark:text-slate-200 dark:group-hover/link:text-emerald-400 line-clamp-2">
                        {blog.title}
                      </p>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-emerald-400 opacity-0 transition-opacity group-hover/link:opacity-100" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Books Section */}
        {data.books && data.books.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => toggleSection("books")}
              className="flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 px-3 py-2 text-left transition-all hover:from-violet-100 hover:to-purple-100 dark:from-violet-900/30 dark:to-purple-900/20 dark:hover:from-violet-900/40 dark:hover:to-purple-900/30"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                <BookOpen className="h-4 w-4" />
                Books ({data.books.length})
              </span>
              {expandedSections.books ? (
                <ChevronUp className="h-4 w-4 text-violet-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-violet-500" />
              )}
            </button>
            {expandedSections.books && (
              <div className="mt-2 space-y-1.5">
                {data.books.map((book, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-violet-100 bg-white p-2 dark:border-violet-800/50 dark:bg-slate-800/50"
                  >
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="mt-0.5 text-[10px] text-violet-600 dark:text-violet-400">
                        by {book.author}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

