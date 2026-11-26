"use client";

import React, { useState } from "react";
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  Edge,
} from "@xyflow/react";
import { RelationshipEdgeData } from "@/domain/schema-graph/types";

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<Edge<RelationshipEdgeData>>) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceTable = data?.sourceTable || "";
  const sourceColumn = data?.sourceColumn || "";
  const targetTable = data?.targetTable || "";
  const targetColumn = data?.targetColumn || "";

  return (
    <>
      {/* Invisible wider stroke for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Visible Bezier Edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHovered || selected ? 2.5 : 1.5,
          stroke: isHovered || selected ? "var(--foreground)" : "var(--border)",
          transition: "stroke 0.2s, stroke-width 0.2s",
        }}
      />

      {/* Tooltip / Label Renderer when hovered or selected */}
      {(isHovered || selected) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan z-50 px-2.5 py-1 rounded-md text-[10px] font-mono bg-card/95 backdrop-blur-md border border-border text-foreground shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className="text-sky-700 dark:text-sky-300 font-semibold">
              {sourceTable}.{sourceColumn}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="text-amber-700 dark:text-amber-300 font-semibold">
              {targetTable}.{targetColumn}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
