"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Video, BookOpen, FileText, ExternalLink } from "lucide-react";
import { Handle, Position } from "@xyflow/react";

interface RoadmapNodeProps {
  data: {
    topicName: string;
    suggestedTime?: string;
    videos?: Array<{ title: string; url: string; description: string }>;
    blogs?: Array<{ title: string; url: string; description: string }>;
    books?: Array<{ title: string; author: string; description: string }>;
    subtopics?: string[];
  };
  selected?: boolean;
}

export function RoadmapNode({ data, selected }: RoadmapNodeProps) {
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const hasResources =
    (data.videos && data.videos.length > 0) ||
    (data.blogs && data.blogs.length > 0) ||
    (data.books && data.books.length > 0) ||
    (data.subtopics && data.subtopics.length > 0);

  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-lg transition-all dark:bg-slate-800 ${
        selected
          ? "border-blue-500 shadow-xl"
          : "border-blue-300 dark:border-blue-600"
      }`}
      style={{ minWidth: "320px", maxWidth: "400px" }}
    >
      <Handle type="target" position={Position.Left} />
      
      {/* Header */}
      <div className="border-b border-slate-200 bg-blue-50 p-4 dark:border-slate-700 dark:bg-blue-900/20">
        <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300">
          {data.topicName}
        </h3>
        {data.suggestedTime && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            ⏱ {data.suggestedTime}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto p-4">
        {/* Subtopics Section */}
        {data.subtopics && data.subtopics.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection("subtopics")}
              className="flex w-full items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <span>Subtopics ({data.subtopics.length})</span>
              {expandedSections.subtopics ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.subtopics && (
              <div className="mt-2 space-y-1 pl-2">
                {data.subtopics.map((subtopic, idx) => (
                  <div
                    key={idx}
                    className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:bg-slate-700/50 dark:text-slate-300"
                  >
                    • {subtopic}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Videos Section */}
        {data.videos && data.videos.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection("videos")}
              className="flex w-full items-center justify-between rounded-md bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              <span className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Videos ({data.videos.length})
              </span>
              {expandedSections.videos ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.videos && (
              <div className="mt-2 space-y-2">
                {data.videos.map((video, idx) => (
                  <a
                    key={idx}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-red-200 bg-white p-2 text-xs transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-slate-700 dark:hover:bg-red-900/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {video.title}
                        </p>
                        {video.description && (
                          <p className="mt-1 text-slate-600 dark:text-slate-400">
                            {video.description}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-red-600 dark:text-red-400" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blogs Section */}
        {data.blogs && data.blogs.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection("blogs")}
              className="flex w-full items-center justify-between rounded-md bg-green-50 px-3 py-2 text-left text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Blogs ({data.blogs.length})
              </span>
              {expandedSections.blogs ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.blogs && (
              <div className="mt-2 space-y-2">
                {data.blogs.map((blog, idx) => (
                  <a
                    key={idx}
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-green-200 bg-white p-2 text-xs transition-colors hover:bg-green-50 dark:border-green-800 dark:bg-slate-700 dark:hover:bg-green-900/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {blog.title}
                        </p>
                        {blog.description && (
                          <p className="mt-1 text-slate-600 dark:text-slate-400">
                            {blog.description}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-green-600 dark:text-green-400" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Books Section */}
        {data.books && data.books.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection("books")}
              className="flex w-full items-center justify-between rounded-md bg-purple-50 px-3 py-2 text-left text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Books ({data.books.length})
              </span>
              {expandedSections.books ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.books && (
              <div className="mt-2 space-y-2">
                {data.books.map((book, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-purple-200 bg-white p-2 text-xs dark:border-purple-800 dark:bg-slate-700"
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        by {book.author}
                      </p>
                    )}
                    {book.description && (
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        {book.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasResources && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            No resources available
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}



