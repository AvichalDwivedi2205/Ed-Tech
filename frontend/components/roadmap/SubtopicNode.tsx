"use client";

import { Handle, Position } from "@xyflow/react";

interface SubtopicNodeProps {
  data: {
    subtopicName: string;
  };
  selected?: boolean;
}

export function SubtopicNode({ data, selected }: SubtopicNodeProps) {
  return (
    <div
      className={`rounded-lg border-2 bg-slate-50 px-4 py-3 shadow-md transition-all dark:bg-slate-700 ${
        selected
          ? "border-slate-500 shadow-lg"
          : "border-slate-300 dark:border-slate-600"
      }`}
      style={{ minWidth: "200px" }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {data.subtopicName}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}


