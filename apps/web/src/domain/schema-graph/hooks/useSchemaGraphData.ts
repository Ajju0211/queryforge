import { useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import { TableMetadata } from "@/domain/connection/models/connection.types";
import {
  GraphFilterState,
  TableNodeData,
  RelationshipEdgeData,
  HiddenRelation,
} from "../types";
import { applyDagreLayout } from "../utils/dagreLayout";

interface UseSchemaGraphDataParams {
  tables: TableMetadata[];
  filterState: GraphFilterState;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  onFocusTable: (tableName: string) => void;
  onExpandRelation: (tableName: string) => void;
}

export function useSchemaGraphData({
  tables,
  filterState,
  selectedTable,
  onSelectTable,
  onFocusTable,
  onExpandRelation,
}: UseSchemaGraphDataParams) {
  // Extract all unique schema names (e.g., 'public', 'auth', 'billing')
  const availableSchemas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.schema) {
        set.add(t.schema);
      }
    });
    return Array.from(set).sort();
  }, [tables]);

  // Precompute relationship graph: outbound targets and inbound sources per table
  const relationIndex = useMemo(() => {
    const tableMap = new Map<string, TableMetadata>();
    const outboundMap = new Map<string, Array<{ column: string; targetTable: string; targetColumn: string }>>();
    const inboundMap = new Map<string, Array<{ sourceTable: string; column: string; targetColumn: string }>>();

    tables.forEach((t) => {
      tableMap.set(t.name, t);
      outboundMap.set(t.name, []);
      inboundMap.set(t.name, []);
    });

    tables.forEach((t) => {
      (t.foreign_keys || []).forEach((fk) => {
        outboundMap.get(t.name)?.push({
          column: fk.column,
          targetTable: fk.target_table,
          targetColumn: fk.target_column,
        });

        inboundMap.get(fk.target_table)?.push({
          sourceTable: t.name,
          column: fk.column,
          targetColumn: fk.target_column,
        });
      });
    });

    return { tableMap, outboundMap, inboundMap };
  }, [tables]);

  // Determine visible tables based on mode, focus, schema, search, and orphan toggle
  const visibleTableMap = useMemo(() => {
    const { tableMap, outboundMap, inboundMap } = relationIndex;
    const {
      mode,
      selectedSchema,
      focusTable,
      expandedTables,
      searchQuery,
      hideOrphans,
    } = filterState;

    let candidateTables: TableMetadata[] = [];

    if (mode === "neighborhood") {
      const activeFocus =
        focusTable ||
        (tables.length > 0
          ? tables.reduce((best, cur) => {
              const bestDegree = (outboundMap.get(best.name)?.length || 0) + (inboundMap.get(best.name)?.length || 0);
              const curDegree = (outboundMap.get(cur.name)?.length || 0) + (inboundMap.get(cur.name)?.length || 0);
              return curDegree > bestDegree ? cur : best;
            }, tables[0]).name
          : null);

      if (activeFocus && tableMap.has(activeFocus)) {
        const neighborhoodSet = new Set<string>([activeFocus]);

        // 1-Hop direct outbound targets
        (outboundMap.get(activeFocus) || []).forEach((r) => {
          if (tableMap.has(r.targetTable)) neighborhoodSet.add(r.targetTable);
        });

        // 1-Hop direct inbound sources
        (inboundMap.get(activeFocus) || []).forEach((r) => {
          if (tableMap.has(r.sourceTable)) neighborhoodSet.add(r.sourceTable);
        });

        // User expanded tables
        (expandedTables || []).forEach((expandedName) => {
          if (tableMap.has(expandedName)) {
            neighborhoodSet.add(expandedName);
            // Also include 1-hop relations of expanded tables
            (outboundMap.get(expandedName) || []).forEach((r) => {
              if (tableMap.has(r.targetTable)) neighborhoodSet.add(r.targetTable);
            });
            (inboundMap.get(expandedName) || []).forEach((r) => {
              if (tableMap.has(r.sourceTable)) neighborhoodSet.add(r.sourceTable);
            });
          }
        });

        candidateTables = Array.from(neighborhoodSet)
          .map((name) => tableMap.get(name)!)
          .filter(Boolean);
      } else {
        candidateTables = tables.slice(0, 20);
      }
    } else if (mode === "schema") {
      candidateTables = tables.filter((t) => {
        if (!selectedSchema || selectedSchema === "all") return true;
        return t.schema === selectedSchema;
      });
    } else {
      // Full mode
      candidateTables = [...tables];
    }

    // Apply Orphan Filter
    if (hideOrphans) {
      candidateTables = candidateTables.filter((t) => {
        const outCount = outboundMap.get(t.name)?.length || 0;
        const inCount = inboundMap.get(t.name)?.length || 0;
        return outCount + inCount > 0;
      });
    }

    // Apply Search Query Filter (if active)
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      candidateTables = candidateTables.filter((t) => {
        const matchesName = t.name.toLowerCase().includes(normalizedQuery);
        const matchesCol = t.columns.some((c) =>
          c.name.toLowerCase().includes(normalizedQuery)
        );
        return matchesName || matchesCol;
      });
    }

    const resultMap = new Map<string, TableMetadata>();
    candidateTables.forEach((t) => resultMap.set(t.name, t));
    return resultMap;
  }, [tables, relationIndex, filterState]);

  // Build React Flow nodes and edges with layout applied
  const { nodes, edges } = useMemo(() => {
    const { outboundMap, inboundMap } = relationIndex;
    const rawNodes: Node<TableNodeData>[] = [];
    const rawEdges: Edge<RelationshipEdgeData>[] = [];

    // Create Nodes
    visibleTableMap.forEach((table, tableName) => {
      const outRelations = outboundMap.get(tableName) || [];
      const inRelations = inboundMap.get(tableName) || [];

      // Identify relations connecting to tables NOT currently visible on the canvas
      const hiddenRelations: HiddenRelation[] = [];

      outRelations.forEach((r) => {
        if (!visibleTableMap.has(r.targetTable)) {
          hiddenRelations.push({
            relatedTable: r.targetTable,
            column: r.column,
            targetColumn: r.targetColumn,
            direction: "outbound",
          });
        }
      });

      inRelations.forEach((r) => {
        if (!visibleTableMap.has(r.sourceTable)) {
          hiddenRelations.push({
            relatedTable: r.sourceTable,
            column: r.column,
            targetColumn: r.targetColumn,
            direction: "inbound",
          });
        }
      });

      rawNodes.push({
        id: tableName,
        type: "tableNode",
        position: { x: 0, y: 0 },
        data: {
          table,
          isFocused: filterState.focusTable === tableName,
          isSelected: selectedTable === tableName,
          isCompact: filterState.isCompactView,
          hiddenRelations,
          onSelectTable,
          onFocusTable,
          onExpandRelation,
        },
      });
    });

    // Create Edges
    visibleTableMap.forEach((table, tableName) => {
      (table.foreign_keys || []).forEach((fk) => {
        if (visibleTableMap.has(fk.target_table)) {
          const edgeId = `edge-${tableName}.${fk.column}->${fk.target_table}.${fk.target_column}`;
          rawEdges.push({
            id: edgeId,
            source: tableName,
            target: fk.target_table,
            sourceHandle: `${tableName}.${fk.column}-source`,
            targetHandle: `${fk.target_table}.${fk.target_column}-target`,
            type: "relationshipEdge",
            animated: filterState.focusTable === tableName || filterState.focusTable === fk.target_table,
            data: {
              sourceTable: tableName,
              sourceColumn: fk.column,
              targetTable: fk.target_table,
              targetColumn: fk.target_column,
            },
          });
        }
      });
    });

    // Apply Dagre layout
    return applyDagreLayout(rawNodes, rawEdges, {
      direction: filterState.layoutDirection,
    });
  }, [
    visibleTableMap,
    relationIndex,
    filterState,
    selectedTable,
    onSelectTable,
    onFocusTable,
    onExpandRelation,
  ]);

  return {
    nodes,
    edges,
    availableSchemas,
    isLargeSchema: tables.length > 50,
    totalTableCount: tables.length,
    visibleTableCount: visibleTableMap.size,
  };
}

