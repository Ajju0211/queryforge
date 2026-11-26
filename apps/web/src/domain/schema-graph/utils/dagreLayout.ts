import dagre from "@dagrejs/dagre";
import { Node, Edge, Position } from "@xyflow/react";
import { TableNodeData, LayoutDirection } from "../types";

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeSep?: number;
  rankSep?: number;
}

const DEFAULT_NODE_WIDTH = 320;
const COMPACT_NODE_HEIGHT = 72;
const HEADER_HEIGHT = 54;
const ROW_HEIGHT = 32;
const FOOTER_HEIGHT = 44;
const PADDING_BOTTOM = 16;

export function calculateNodeHeight(node: Node<TableNodeData>): number {
  if (node.data.isCompact) {
    return COMPACT_NODE_HEIGHT;
  }
  const colCount = node.data.table.columns.length;
  const hasHiddenRelations = (node.data.hiddenRelations?.length ?? 0) > 0;
  return HEADER_HEIGHT + colCount * ROW_HEIGHT + (hasHiddenRelations ? FOOTER_HEIGHT : PADDING_BOTTOM);
}

export function applyDagreLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node<TableNodeData>[]; edges: Edge[] } {
  const direction = options.direction || "LR";
  const nodeWidth = options.nodeWidth || DEFAULT_NODE_WIDTH;
  const nodeSep = options.nodeSep || 60;
  const rankSep = options.rankSep || 100;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    align: "DL",
  });

  // Register nodes with dagre
  nodes.forEach((node) => {
    const height = calculateNodeHeight(node);
    dagreGraph.setNode(node.id, { width: nodeWidth, height });
  });

  // Register edges with dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Execute layout calculation
  dagre.layout(dagreGraph);

  // Map calculated coordinates back to nodes
  const layoutedNodes = nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    const height = calculateNodeHeight(node);

    if (!dagreNode) {
      return node;
    }

    return {
      ...node,
      targetPosition: direction === "LR" ? Position.Left : Position.Top,
      sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
      position: {
        x: Math.round(dagreNode.x - nodeWidth / 2),
        y: Math.round(dagreNode.y - height / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
