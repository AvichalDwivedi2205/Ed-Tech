"use client";

import { useCallback, useMemo, useEffect } from "react";
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
import { RoadmapNode } from "./RoadmapNode";
import { SubtopicNode } from "./SubtopicNode";

const nodeTypes = {
  roadmap: RoadmapNode,
  subtopic: SubtopicNode,
};

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
    const topicNodeWidth = 400;
    const subtopicNodeWidth = 250;
    const horizontalSpacing = 450;
    const verticalSpacing = 300;

    // Process roadmap data - filter out TeachingStyle, title, and RoadmapTitle keys
    const topics = Object.keys(roadmapData).filter(
      (key) => key !== "TeachingStyle" && key !== "title" && key !== "RoadmapTitle" && roadmapData[key]?.TopicName
    );
    
    topics.forEach((topicId, topicIndex) => {
      const topic = roadmapData[topicId];
      const topicName = topic?.TopicName || topicId;
      const contentList = topic?.ContentList || {};
      const subtopics = contentList?.topics || [];
      const videos = contentList?.videos || [];
      const blogs = contentList?.blogs || [];
      const books = contentList?.books || [];
      const suggestedTime = topic?.SuggestedTimeToComplete;

      // Create topic node (main topic) with resources
      const topicNode: Node = {
        id: `topic-${topicId}`,
        type: "roadmap",
        position: { x: xPosition, y: yPosition },
        data: {
          topicName,
          suggestedTime,
          videos,
          blogs,
          books,
          subtopics,
        },
        draggable: true,
      };
      flowNodes.push(topicNode);

      // Create subtopic nodes (from topics array)
      if (Array.isArray(subtopics) && subtopics.length > 0) {
        subtopics.forEach((subtopic: string, subtopicIndex: number) => {
          const subtopicNode: Node = {
            id: `subtopic-${topicId}-${subtopicIndex}`,
            type: "subtopic",
            position: {
              x: xPosition + horizontalSpacing,
              y: yPosition + (subtopicIndex * 80), // Stack subtopics vertically
            },
            data: {
              subtopicName: subtopic,
            },
            draggable: true,
          };
          flowNodes.push(subtopicNode);

          // Create edge from topic to subtopic
          flowEdges.push({
            id: `edge-${topicId}-${subtopicIndex}`,
            source: `topic-${topicId}`,
            target: `subtopic-${topicId}-${subtopicIndex}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#64748b", strokeWidth: 2 },
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

  // Update nodes when roadmapData changes
  useEffect(() => {
    if (nodes.length > 0) {
      setNodes(nodes);
    }
  }, [nodes, setNodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-400">No roadmap data available</p>
      </div>
    );
  }

  return (
    <div className="h-[800px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 overflow-hidden">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50 dark:bg-slate-900"
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "roadmap") return "#2563eb";
            return "#64748b";
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
