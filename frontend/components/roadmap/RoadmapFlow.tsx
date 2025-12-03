"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface RoadmapFlowProps {
  roadmapData: any;
}

export function RoadmapFlow({ roadmapData }: RoadmapFlowProps) {
  const { nodes, edges } = useMemo(() => {
    if (!roadmapData || typeof roadmapData !== "object") {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    let yPosition = 0;
    let xPosition = 0;
    const nodeWidth = 250;
    const nodeHeight = 120;
    const horizontalSpacing = 300;
    const verticalSpacing = 200;

    // Process roadmap data - filter out TeachingStyle and other non-subtopic keys
    const topics = Object.keys(roadmapData).filter(
      (key) => key !== "TeachingStyle" && roadmapData[key]?.TopicName
    );
    
    topics.forEach((topicId, topicIndex) => {
      const topic = roadmapData[topicId];
      const topicName = topic?.TopicName || topicId;
      const contentList = topic?.ContentList?.topics || [];
      const suggestedTime = topic?.SuggestedTimeToComplete;

      // Create topic node (main topic)
      const topicNode: Node = {
        id: `topic-${topicId}`,
        type: "default",
        position: { x: xPosition, y: yPosition },
        data: {
          label: (
            <div className="p-3">
              <div className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-1">
                {topicName}
              </div>
              {suggestedTime && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  ⏱ {suggestedTime}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: "white",
          border: "3px solid #2563eb",
          borderRadius: "12px",
          padding: 0,
          width: nodeWidth,
          minHeight: nodeHeight,
          color: "#1e293b",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        },
      };
      flowNodes.push(topicNode);

      // Create subtopic nodes (from topics array)
      if (Array.isArray(contentList) && contentList.length > 0) {
        contentList.forEach((subtopic: string, subtopicIndex: number) => {
          const subtopicNode: Node = {
            id: `subtopic-${topicId}-${subtopicIndex}`,
            type: "default",
            position: {
              x: xPosition + (subtopicIndex + 1) * horizontalSpacing,
              y: yPosition,
            },
            data: {
              label: (
                <div className="p-3">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {subtopic}
                  </div>
                </div>
              ),
            },
            style: {
              background: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: "8px",
              padding: 0,
              width: nodeWidth,
              minHeight: 80,
              color: "#475569",
            },
          };
          flowNodes.push(subtopicNode);

          // Create edge from topic to subtopic
          flowEdges.push({
            id: `edge-${topicId}-${subtopicIndex}`,
            source: `topic-${topicId}`,
            target: `subtopic-${topicId}-${subtopicIndex}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#64748b", strokeWidth: 3 },
            label: `${subtopicIndex + 1}`,
          });
        });
      }

      // Move to next row - arrange topics vertically
      yPosition += verticalSpacing;
      // Reset x position for new row
      xPosition = 0;
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [roadmapData]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-400">No roadmap data available</p>
      </div>
    );
  }

  return (
    <div className="h-[700px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 overflow-hidden">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-slate-50 dark:bg-slate-900"
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.startsWith("topic-")) return "#2563eb";
            return "#64748b";
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

