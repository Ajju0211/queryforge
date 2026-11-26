"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { GraphFilterState, TableNodeData } from "@/domain/schema-graph/types";
import { useSchemaGraphData } from "@/domain/schema-graph/hooks/useSchemaGraphData";
import { SchemaGraphToolbar } from "./SchemaGraphToolbar";
import { SchemaGraphCanvas } from "./SchemaGraphCanvas";
import { TableDetailDrawer } from "./TableDetailDrawer";
import { Loader2, Database, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function SchemaGraphInner() {
  const {
    connections,
    activeConnection,
    activeSchema,
    isLoadingSchema,
    isRefreshingSchema,
    refreshSchema,
  } = useConnectionManager();

  const tables = useMemo(() => activeSchema?.tables || [], [activeSchema?.tables]);
  const isLargeDatabase = tables.length > 50;

  // Filter & Layout State
  const [filterState, setFilterState] = useState<GraphFilterState>(() => ({
    mode: isLargeDatabase ? "neighborhood" : "full",
    selectedSchema: "all",
    focusTable: null,
    expandedTables: [],
    searchQuery: "",
    hideOrphans: false,
    layoutDirection: "LR",
    isCompactView: false,
  }));

  // Selected table for detailed drawer inspector
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  // Handlers
  const handleSelectTable = useCallback((tableName: string | null) => {
    setSelectedTableName(tableName);
  }, []);

  const handleFocusTable = useCallback((tableName: string) => {
    setFilterState((prev) => ({
      ...prev,
      mode: "neighborhood",
      focusTable: tableName,
      expandedTables: [],
    }));
    setSelectedTableName(tableName);
  }, []);

  const handleExpandRelation = useCallback((tableName: string) => {
    setFilterState((prev) => {
      if (prev.expandedTables.includes(tableName)) return prev;
      return {
        ...prev,
        expandedTables: [...prev.expandedTables, tableName],
      };
    });
  }, []);

  const handleFilterUpdate = useCallback((updates: Partial<GraphFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleResetNeighborhood = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      focusTable: null,
      expandedTables: [],
    }));
  }, []);

  // Compute graph data
  const {
    nodes: calculatedNodes,
    edges: calculatedEdges,
    availableSchemas,
    isLargeSchema,
    totalTableCount,
    visibleTableCount,
  } = useSchemaGraphData({
    tables,
    filterState,
    selectedTable: selectedTableName,
    onSelectTable: handleSelectTable,
    onFocusTable: handleFocusTable,
    onExpandRelation: handleExpandRelation,
  });

  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(calculatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(calculatedEdges);

  // Sync state when calculated layout changes (e.g. schema loads or filter adjusts)
  useEffect(() => {
    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [calculatedNodes, calculatedEdges, setNodes, setEdges]);

  // Access ReactFlow viewport helper
  const { fitView } = useReactFlow();

  const handleFitView = useCallback(() => {
    setTimeout(() => {
      fitView({ duration: 400, padding: 0.2 });
    }, 50);
  }, [fitView]);

  // Auto-fit viewport whenever tables are loaded into the canvas
  useEffect(() => {
    if (calculatedNodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ duration: 400, padding: 0.2 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [calculatedNodes.length, filterState.layoutDirection, fitView]);

  // Selected table metadata for the detail drawer
  const selectedTableMetadata = useMemo(() => {
    if (!selectedTableName) return null;
    return tables.find((t) => t.name === selectedTableName) || null;
  }, [tables, selectedTableName]);

  // Loading state when schema introspection or cached graph is loading
  if (isLoadingSchema && (!activeSchema || tables.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-3 text-xs font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span>Loading schema cache and relationship graph...</span>
      </div>
    );
  }

  // Fallback when no connection is active
  if (!activeConnection && !isLoadingSchema) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-3 text-xs">
        <AlertCircle className="w-8 h-8 text-amber-500" />
        <p className="font-medium text-foreground">No active database selected.</p>
        <p>Please select a database from the sidebar or project list.</p>
      </div>
    );
  }

  // Empty state when database has 0 tables
  if (tables.length === 0 && !isLoadingSchema) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-3 text-xs">
        <Database className="w-8 h-8 text-muted-foreground" />
        <p className="font-semibold text-foreground text-sm">No tables found in this database.</p>
        <p>Introspect the database or click below to refresh the cached schema.</p>
        <Button
          variant="outline"
          size="sm"
          disabled={isRefreshingSchema}
          onClick={() => refreshSchema()}
          className="gap-2 text-xs cursor-pointer mt-2"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingSchema && "animate-spin")} />
          <span>Refresh Schema</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden relative">
      {/* Top Toolbar */}
      <SchemaGraphToolbar
        connections={connections}
        activeConnection={activeConnection}
        filterState={filterState}
        availableSchemas={availableSchemas}
        visibleCount={visibleTableCount}
        totalCount={totalTableCount}
        onFilterChange={handleFilterUpdate}
        onFitView={handleFitView}
        onResetNeighborhood={handleResetNeighborhood}
      />

      {/* Main Diagram Canvas */}
      <div className="flex-1 relative min-w-0 min-h-0 overflow-hidden">
        <SchemaGraphCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectTable={handleSelectTable}
          isLargeSchema={isLargeSchema}
          totalTableCount={totalTableCount}
          visibleTableCount={visibleTableCount}
          onSwitchToNeighborhood={() =>
            handleFilterUpdate({ mode: "neighborhood", focusTable: tables[0]?.name || null })
          }
        />

        {/* Selected Table Inspector Drawer */}
        {selectedTableMetadata && (
          <TableDetailDrawer
            table={selectedTableMetadata}
            connectionId={activeConnection?.id || ""}
            allTables={tables}
            onClose={() => setSelectedTableName(null)}
            onFocusTable={handleFocusTable}
            onSelectTable={handleSelectTable}
          />
        )}
      </div>
    </div>
  );
}

export function SchemaGraphWorkspace() {
  return (
    <ReactFlowProvider>
      <SchemaGraphInner />
    </ReactFlowProvider>
  );
}
