"use client";

import { useMemo, useState, useCallback } from "react";
import { TableMetadata, ColumnMetadata, ForeignKeyMetadata } from "../models/connection.types";
import { useConnectionStore } from "../store/connection.store";

export type SchemaFilterMode = "all" | "with_pk" | "with_fk" | "excluded";
export type SchemaViewMode = "schema" | "data" | "sql";

export function useSchemaExplorer() {
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const connections = useConnectionStore((s) => s.connections);
  const activeSchema = useConnectionStore((s) => s.activeSchema);
  const isLoadingSchema = useConnectionStore((s) => s.isLoadingSchema);
  const isRefreshingSchema = useConnectionStore((s) => s.isRefreshingSchema);
  const toggleTableExclusion = useConnectionStore((s) => s.toggleTableExclusion);
  const selectConnection = useConnectionStore((s) => s.selectConnection);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string>("public");
  const [filterMode, setFilterMode] = useState<SchemaFilterMode>("all");
  const [activeView, setActiveView] = useState<SchemaViewMode>("schema");
  const [rlsStateMap, setRlsStateMap] = useState<Record<string, boolean>>({});

  // Local frontend overrides map: table_name -> TableMetadata
  const [editedTablesMap, setEditedTablesMap] = useState<Record<string, TableMetadata>>({});

  // Merged tables: base introspected tables updated with local frontend edits
  const tables = useMemo(() => {
    const rawTables = activeSchema?.tables || [];
    return rawTables.map((t) => editedTablesMap[t.name] || t);
  }, [activeSchema, editedTablesMap]);

  // Extract distinct schemas from tables
  const availableSchemas = useMemo(() => {
    if (!tables.length) return ["public"];
    const schemasSet = new Set<string>();
    tables.forEach((t) => {
      if (t.schema) schemasSet.add(t.schema);
    });
    if (schemasSet.size === 0) schemasSet.add("public");
    return Array.from(schemasSet);
  }, [tables]);

  // Filter tables by schema, search query, and filter mode
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // 1. Schema filter
      if (selectedSchema !== "all" && table.schema && table.schema !== selectedSchema) {
        return false;
      }

      // 2. Filter mode
      if (filterMode === "with_pk" && !table.columns.some((c) => c.is_primary_key)) {
        return false;
      }
      if (filterMode === "with_fk" && (!table.foreign_keys || table.foreign_keys.length === 0)) {
        return false;
      }
      if (filterMode === "excluded" && !table.is_excluded) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = table.name.toLowerCase().includes(q);
        const matchesSchema = table.schema.toLowerCase().includes(q);
        const matchesCol = table.columns.some((c) => c.name.toLowerCase().includes(q));
        if (!matchesName && !matchesSchema && !matchesCol) {
          return false;
        }
      }

      return true;
    });
  }, [tables, selectedSchema, filterMode, searchQuery]);

  // Selected table object
  const selectedTable: TableMetadata | null = useMemo(() => {
    if (!tables.length) return null;
    if (selectedTableName) {
      const match = tables.find((t) => t.name === selectedTableName);
      if (match) return match;
    }
    // Default to first filtered table, or first table
    return filteredTables[0] || tables[0] || null;
  }, [tables, filteredTables, selectedTableName]);

  // ---------------------------------------------------------------------------
  // Frontend-only Schema Editing Mutators (SSOT)
  // ---------------------------------------------------------------------------

  /** Update table name in local state */
  const updateTableName = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    setEditedTablesMap((prev) => {
      const existing = prev[oldName] || activeSchema?.tables.find((t) => t.name === oldName);
      if (!existing) return prev;
      const next = { ...prev };
      delete next[oldName];
      next[trimmed] = { ...existing, name: trimmed };
      return next;
    });

    if (selectedTableName === oldName) {
      setSelectedTableName(trimmed);
    }
  }, [activeSchema, selectedTableName]);

  /** Update table schema in local state */
  const updateTableSchema = useCallback((tableName: string, newSchema: string) => {
    const trimmed = newSchema.trim();
    if (!trimmed) return;

    setEditedTablesMap((prev) => {
      const existing = prev[tableName] || activeSchema?.tables.find((t) => t.name === tableName);
      if (!existing) return prev;
      return {
        ...prev,
        [tableName]: { ...existing, schema: trimmed },
      };
    });
  }, [activeSchema]);

  /** Add a new column to a table */
  const addColumn = useCallback((tableName: string, col: ColumnMetadata) => {
    setEditedTablesMap((prev) => {
      const existing = prev[tableName] || activeSchema?.tables.find((t) => t.name === tableName);
      if (!existing) return prev;
      if (existing.columns.some((c) => c.name.toLowerCase() === col.name.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        [tableName]: {
          ...existing,
          columns: [...existing.columns, col],
        },
      };
    });
  }, [activeSchema]);

  /** Update an existing column */
  const updateColumn = useCallback(
    (tableName: string, columnName: string, updates: Partial<ColumnMetadata>) => {
      setEditedTablesMap((prev) => {
        const existing = prev[tableName] || activeSchema?.tables.find((t) => t.name === tableName);
        if (!existing) return prev;
        return {
          ...prev,
          [tableName]: {
            ...existing,
            columns: existing.columns.map((c) => (c.name === columnName ? { ...c, ...updates } : c)),
          },
        };
      });
    },
    [activeSchema]
  );

  /** Delete a column from a table */
  const deleteColumn = useCallback((tableName: string, columnName: string) => {
    setEditedTablesMap((prev) => {
      const existing = prev[tableName] || activeSchema?.tables.find((t) => t.name === tableName);
      if (!existing) return prev;
      return {
        ...prev,
        [tableName]: {
          ...existing,
          columns: existing.columns.filter((c) => c.name !== columnName),
          foreign_keys: (existing.foreign_keys || []).filter((fk) => fk.column !== columnName),
        },
      };
    });
  }, [activeSchema]);

  /** Add a foreign key constraint */
  const addConstraint = useCallback((tableName: string, fk: ForeignKeyMetadata) => {
    setEditedTablesMap((prev) => {
      const existing = prev[tableName] || activeSchema?.tables.find((t) => t.name === tableName);
      if (!existing) return prev;
      return {
        ...prev,
        [tableName]: {
          ...existing,
          foreign_keys: [...(existing.foreign_keys || []), fk],
          columns: existing.columns.map((c) => (c.name === fk.column ? { ...c, is_foreign_key: true } : c)),
        },
      };
    });
  }, [activeSchema]);

  /** Delete a foreign key constraint */
  const deleteConstraint = useCallback((tableName: string, fkColumn: string) => {
    setEditedTablesMap((prev) => {
      const existing = prev[tableName] || activeSchema?.tables.find((t) => t.name === tableName);
      if (!existing) return prev;
      const remainingFks = (existing.foreign_keys || []).filter((fk) => fk.column !== fkColumn);
      const hasOtherFk = remainingFks.some((fk) => fk.column === fkColumn);
      return {
        ...prev,
        [tableName]: {
          ...existing,
          foreign_keys: remainingFks,
          columns: existing.columns.map((c) => (c.name === fkColumn && !hasOtherFk ? { ...c, is_foreign_key: false } : c)),
        },
      };
    });
  }, [activeSchema]);

  /** Reset a table back to introspected schema */
  const resetTableSchema = useCallback((tableName: string) => {
    setEditedTablesMap((prev) => {
      const next = { ...prev };
      delete next[tableName];
      return next;
    });
  }, []);

  // RLS toggle handler
  const isRowLevelSecurityEnabled = useCallback(
    (tableName: string) => {
      return rlsStateMap[tableName] ?? false;
    },
    [rlsStateMap]
  );

  const toggleRowLevelSecurity = useCallback(
    (tableName: string) => {
      setRlsStateMap((prev) => ({
        ...prev,
        [tableName]: !prev[tableName],
      }));
    },
    []
  );

  // Calculated statistics
  const stats = useMemo(() => {
    const totalTables = tables.length;
    const totalColumns = tables.reduce((acc, t) => acc + t.columns.length, 0);
    const totalEstimatedRows = tables.reduce(
      (acc, t) => acc + (t.estimated_row_count || 0),
      0
    );
    const excludedCount = tables.filter((t) => t.is_excluded).length;

    return {
      totalTables,
      totalColumns,
      totalEstimatedRows,
      excludedCount,
    };
  }, [tables]);

  return {
    activeConnection,
    connections,
    selectConnection,
    activeSchema,
    isLoadingSchema,
    isRefreshingSchema,
    tables,
    filteredTables,
    availableSchemas,
    selectedSchema,
    setSelectedSchema,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    selectedTableName: selectedTable?.name || null,
    setSelectedTableName,
    selectedTable,
    activeView,
    setActiveView,
    isRowLevelSecurityEnabled,
    toggleRowLevelSecurity,
    stats,
    toggleExclusion: (tableName: string, isExcluded: boolean, schema?: string) =>
      toggleTableExclusion(tableName, isExcluded, schema),

    // Schema Mutators (Frontend-only SSOT)
    updateTableName,
    updateTableSchema,
    addColumn,
    updateColumn,
    deleteColumn,
    addConstraint,
    deleteConstraint,
    resetTableSchema,
  };
}
