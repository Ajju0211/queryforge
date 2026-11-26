"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TableNode } from "./TableNode";
import { RelationshipEdge } from "./RelationshipEdge";
import { TableNodeData } from "@/domain/schema-graph/types";
import { Sparkles } from "lucide-react";

interface SchemaGraphCanvasProps {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<TableNodeData>>;
  onEdgesChange: OnEdgesChange;
  onSelectTable: (tableName: string | null) => void;
  isLargeSchema: boolean;
  totalTableCount: number;
  visibleTableCount: number;
  onSwitchToNeighborhood: () => void;
}

export function SchemaGraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSelectTable,
  isLargeSchema,
  totalTableCount,
  visibleTableCount,
  onSwitchToNeighborhood,
}: SchemaGraphCanvasProps) {
  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);
  const edgeTypes = useMemo(() => ({ relationshipEdge: RelationshipEdge }), []);

  return (
    <div className="relative w-full h-full min-w-0 min-h-0 bg-background select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={() => onSelectTable(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "relationshipEdge",
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Background gap={24} size={1.2} className="opacity-40" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !shadow-md !rounded-lg overflow-hidden [&>button]:!bg-card [&>button]:!border-border [&>button]:!fill-foreground [&>button]:hover:!bg-muted"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as TableNodeData;
            if (data?.isFocused) return "#06b6d4";
            if (data?.isSelected) return "#10b981";
            return "#71717a";
          }}
          maskColor="rgba(0, 0, 0, 0.4)"
          className="!bg-card/90 !border !border-border !rounded-lg !shadow-xl !overflow-hidden hidden md:block"
          zoomable
          pannable
        />

        {/* Large Schema Guard Notification Pill */}
        {isLargeSchema && visibleTableCount < totalTableCount && (
          <Panel position="top-center">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/95 border border-border text-foreground text-xs font-mono shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
              <Sparkles className="w-3.5 h-3.5 text-signal shrink-0" />
              <span>
                Large schema guard active: showing {visibleTableCount} of {totalTableCount} tables.
              </span>
              <button
                type="button"
                onClick={onSwitchToNeighborhood}
                className="text-foreground hover:underline font-semibold cursor-pointer ml-1"
              >
                Focus table
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
