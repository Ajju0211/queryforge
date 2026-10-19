"use client";

import { useMemo, useState } from "react";
import { TableMetadata } from "../models/connection.types";
import { useConnectionStore } from "../store/connection.store";

export function useSchemaExplorer() {
  const activeSchema = useConnectionStore((s) => s.activeSchema);
  const isLoadingSchema = useConnectionStore((s) => s.isLoadingSchema);
  const isRefreshingSchema = useConnectionStore((s) => s.isRefreshingSchema);
  const toggleTableExclusion = useConnectionStore((s) => s.toggleTableExclusion);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  const tables = useMemo(() => {
    return activeSchema?.tables || [];
  }, [activeSchema]);

  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase().trim();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.schema.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [tables, searchQuery]);

  // Selected table object
  const selectedTable: TableMetadata | null = useMemo(() => {
    if (!tables.length) return null;
    if (selectedTableName) {
      const match = tables.find((t) => t.name === selectedTableName);
      if (match) return match;
    }
    return tables[0] || null;
  }, [tables, selectedTableName]);

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
    activeSchema,
    isLoadingSchema,
    isRefreshingSchema,
    searchQuery,
    setSearchQuery,
    selectedTableName: selectedTable?.name || null,
    setSelectedTableName,
    selectedTable,
    filteredTables,
    stats,
    toggleExclusion: (tableName: string, isExcluded: boolean, schema?: string) =>
      toggleTableExclusion(tableName, isExcluded, schema),
  };
}
