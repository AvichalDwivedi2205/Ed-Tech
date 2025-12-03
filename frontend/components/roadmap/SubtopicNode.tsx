"use client";

import { Handle, Position } from "@xyflow/react";
import { CircleDot, BookMarked } from "lucide-react";

interface SubtopicNodeProps {
  data: {
    subtopicName: string;
    index?: number;
  };
  selected?: boolean;
}

export function SubtopicNode({ data, selected }: SubtopicNodeProps) {
  // Check if this is a PROJECT item
  const isProject = data.subtopicName.includes("**PROJECT") || data.subtopicName.includes("PROJECT");
  
  // Clean up the subtopic name (remove markdown ** markers)
  const cleanName = data.subtopicName.replace(/\*\*/g, "");

  return (
    <div
      className={`group relative rounded-xl border-2 px-4 py-3 shadow-lg transition-all duration-300 ${
        isProject 
          ? `bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 ${
              selected
                ? "border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/20"
                : "border-amber-300 hover:border-amber-400 hover:shadow-amber-500/10 dark:border-amber-600/50 dark:hover:border-amber-500"
            }`
          : `bg-gradient-to-r from-slate-50 to-purple-50/50 dark:from-slate-800 dark:to-purple-900/20 ${
              selected
                ? "border-purple-500 ring-2 ring-purple-500/20 shadow-purple-500/20"
                : "border-slate-200 hover:border-purple-400 hover:shadow-purple-500/10 dark:border-slate-600 dark:hover:border-purple-500"
            }`
      }`}
      style={{ minWidth: "280px", maxWidth: "450px" }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className={`!w-2.5 !h-2.5 !border-2 !border-white dark:!border-slate-800 ${
          isProject ? "!bg-amber-500" : "!bg-purple-500"
        }`}
      />
      
      <div className="flex items-start gap-3">
        {/* Index Badge or Project Icon */}
        {isProject ? (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 dark:bg-amber-500/30">
            <BookMarked className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        ) : data.index ? (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/20">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {data.index}
            </span>
          </div>
        ) : (
          <CircleDot className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500 dark:text-purple-400" />
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${
            isProject 
              ? "text-amber-800 dark:text-amber-200" 
              : "text-slate-700 dark:text-slate-200"
          }`}>
            {cleanName}
          </p>
          {isProject && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              Hands-on Project
            </span>
          )}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className={`!w-2.5 !h-2.5 !border-2 !border-white dark:!border-slate-800 ${
          isProject ? "!bg-amber-500" : "!bg-purple-500"
        }`}
      />
    </div>
  );
}



