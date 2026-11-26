"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Key,
  Link2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Search,
  Download,
  Copy,
  Check,
  Columns3,
  FileSpreadsheet,
  FileCode,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Layers,
  X,
  Eye,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ColumnMetadata } from "@/domain/connection/models/connection.types";

export interface DataTableColumn {
  id: string;
  header?: string;
  accessorKey?: string;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  nullable?: boolean;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  cell?: (row: Record<string, unknown>, value: unknown) => React.ReactNode;
}

export interface DataTableProps {
  title?: string;
  description?: string;
  data: Record<string, unknown>[];
  columns?: DataTableColumn[];
  columnMetadata?: ColumnMetadata[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  isLoading?: boolean;
  error?: string | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (column: string, order: "asc" | "desc") => void;
  sortColumn?: string;
  sortOrder?: "asc" | "desc";
  onRefresh?: () => void;
  searchable?: boolean;
  exportable?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Format raw PostgreSQL data type into compact QueryForge pill label
 */
function formatDataType(rawType?: string): string {
  if (!rawType) return "text";
  const lower = rawType.toLowerCase().trim();
  if (lower.startsWith("character varying") || lower.startsWith("varchar")) return "varchar";
  if (lower === "text") return "text";
  if (lower === "integer" || lower === "int4") return "int4";
  if (lower === "bigint" || lower === "int8") return "int8";
  if (lower === "smallint" || lower === "int2") return "int2";
  if (lower === "boolean" || lower === "bool") return "bool";
  if (lower.includes("timestamp with time zone") || lower === "timestamptz") return "timestamptz";
  if (lower.includes("timestamp")) return "timestamp";
  if (lower === "date") return "date";
  if (lower === "time") return "time";
  if (lower.startsWith("numeric") || lower.startsWith("decimal")) return "numeric";
  if (lower === "real" || lower === "float4") return "float4";
  if (lower === "double precision" || lower === "float8") return "float8";
  if (lower === "uuid") return "uuid";
  if (lower === "jsonb") return "jsonb";
  if (lower === "json") return "json";
  if (lower === "bytea") return "bytea";
  return lower.split("(")[0];
}

/**
 * Returns color-coded style for different column data types in QueryForge
 */
function getDataTypeColor(typePill: string): string {
  switch (typePill) {
    case "int4":
    case "int8":
    case "int2":
    case "numeric":
    case "float4":
    case "float8":
      return "text-sky-700 bg-sky-500/10 border-sky-500/25 dark:text-sky-300";
    case "varchar":
    case "text":
      return "text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300";
    case "bool":
      return "text-purple-700 bg-purple-500/10 border-purple-500/25 dark:text-purple-300";
    case "uuid":
      return "text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300";
    case "timestamp":
    case "timestamptz":
    case "date":
    case "time":
      return "text-teal-700 bg-teal-500/10 border-teal-500/25 dark:text-teal-300";
    case "json":
    case "jsonb":
      return "text-rose-700 bg-rose-500/10 border-rose-500/25 dark:text-rose-300";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

export function DataTable({
  title,
  description,
  data = [],
  columns: userColumns,
  columnMetadata,
  totalCount: serverTotalCount,
  page: serverPage = 1,
  pageSize: serverPageSize = 50,
  isLoading = false,
  error = null,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  sortColumn,
  sortOrder,
  onRefresh,
  searchable = true,
  exportable = true,
  emptyMessage = "No records found in this table.",
  className,
}: DataTableProps) {
  // Local state for client-side fallback if not server-controlled
  const [localSearch, setLocalSearch] = useState("");
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(50);
  const [localSortCol, setLocalSortCol] = useState<string | null>(null);
  const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">("asc");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [inspectedRow, setInspectedRow] = useState<Record<string, unknown> | null>(null);
  const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);

  const isServerSide = Boolean(onPageChange || onSortChange);

  // Derive consolidated columns from metadata or userColumns or first data item
  const resolvedColumns = useMemo<DataTableColumn[]>(() => {
    if (userColumns && userColumns.length > 0) {
      return userColumns;
    }

    if (columnMetadata && columnMetadata.length > 0) {
      return columnMetadata.map((col) => ({
        id: col.name,
        header: col.name,
        accessorKey: col.name,
        dataType: col.data_type,
        isPrimaryKey: col.is_primary_key,
        isForeignKey: col.is_foreign_key,
        nullable: col.nullable,
        sortable: true,
      }));
    }

    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      return keys.map((key) => ({
        id: key,
        header: key,
        accessorKey: key,
        sortable: true,
      }));
    }

    return [];
  }, [userColumns, columnMetadata, data]);

  // Visible columns
  const visibleColumns = useMemo(() => {
    return resolvedColumns.filter((col) => !hiddenColumns.has(col.id));
  }, [resolvedColumns, hiddenColumns]);

  // Client-side search and sorting if not server-controlled
  const processedData = useMemo(() => {
    if (isServerSide) return data;

    let rows = [...data];

    // Filter
    if (localSearch.trim()) {
      const query = localSearch.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        })
      );
    }

    // Sort
    if (localSortCol) {
      rows.sort((a, b) => {
        const valA = a[localSortCol];
        const valB = b[localSortCol];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return localSortOrder === "asc" ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB));
        return localSortOrder === "asc" ? comp : -comp;
      });
    }

    return rows;
  }, [data, isServerSide, localSearch, localSortCol, localSortOrder]);

  // Pagination bounds
  const currentPage = isServerSide ? serverPage : localPage;
  const currentPageSize = isServerSide ? serverPageSize : localPageSize;
  const totalRows = isServerSide
    ? serverTotalCount ?? data.length
    : processedData.length;

  const totalPages = Math.max(1, Math.ceil(totalRows / currentPageSize));

  // Client-side sliced rows
  const displayRows = useMemo(() => {
    if (isServerSide) return data;
    const start = (currentPage - 1) * currentPageSize;
    return processedData.slice(start, start + currentPageSize);
  }, [data, isServerSide, processedData, currentPage, currentPageSize]);

  // Sorting handler
  const handleSort = (columnId: string) => {
    if (isServerSide) {
      if (sortColumn === columnId) {
        const nextOrder = sortOrder === "asc" ? "desc" : "asc";
        onSortChange?.(columnId, nextOrder);
      } else {
        onSortChange?.(columnId, "asc");
      }
    } else {
      if (localSortCol === columnId) {
        setLocalSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setLocalSortCol(columnId);
        setLocalSortOrder("asc");
      }
    }
  };

  // Pagination handler
  const goToPage = (newPage: number) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    if (isServerSide) {
      onPageChange?.(target);
    } else {
      setLocalPage(target);
    }
  };

  const changePageSize = (newSize: number) => {
    if (isServerSide) {
      onPageSizeChange?.(newSize);
    } else {
      setLocalPageSize(newSize);
      setLocalPage(1);
    }
  };

  // Copy cell value
  const copyCellValue = async (cellKey: string, value: unknown) => {
    try {
      const text =
        typeof value === "object" && value !== null
          ? JSON.stringify(value, null, 2)
          : String(value ?? "");
      await navigator.clipboard.writeText(text);
      setCopiedCellKey(cellKey);
      setTimeout(() => setCopiedCellKey(null), 1500);
      toast.success("Copied to clipboard", { duration: 1500 });
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    try {
      const jsonString = JSON.stringify(isServerSide ? data : processedData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "table_data"}_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Exported table as JSON");
    } catch {
      toast.error("Export failed");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const rows = isServerSide ? data : processedData;
      if (rows.length === 0) {
        toast.info("No data to export");
        return;
      }
      const headers = visibleColumns.map((c) => c.header || c.id);
      const keys = visibleColumns.map((c) => c.accessorKey || c.id);

      const csvRows = [
        headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
        ...rows.map((row) =>
          keys
            .map((k) => {
              const val = row[k];
              if (val === null || val === undefined) return '""';
              if (typeof val === "object") {
                return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
              }
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",")
        ),
      ];

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "table_data"}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Exported table as CSV");
    } catch {
      toast.error("Export failed");
    }
  };

  // Render individual cell with QueryForge styling
  const renderCellContent = (
    row: Record<string, unknown>,
    column: DataTableColumn,
    value: unknown,
    rowIdx: number
  ) => {
    if (column.cell) {
      return column.cell(row, value);
    }

    const cellKey = `${rowIdx}_${column.id}`;
    const isCopied = copiedCellKey === cellKey;

    if (value === null || value === undefined) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono italic text-muted-foreground/60 bg-muted/40 border border-border/40 select-none">
          NULL
        </span>
      );
    }

    if (typeof value === "boolean") {
      return value ? (
        <span className="inline-flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
          true
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          false
        </span>
      );
    }

    if (typeof value === "number") {
      return (
        <span className="font-mono text-xs tabular-nums text-foreground/90">
          {value.toLocaleString()}
        </span>
      );
    }

    if (typeof value === "object") {
      const isArray = Array.isArray(value);
      const label = isArray
        ? `[${(value as unknown[]).length} items]`
        : `{${Object.keys(value as Record<string, unknown>).length} keys}`;

      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInspectedRow(row);
          }}
          className="inline-flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-700 transition-colors hover:bg-cyan-500/20 dark:text-cyan-300"
        >
          <FileCode className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
          <span>{label}</span>
        </button>
      );
    }

    const strValue = String(value);

    // Date/Timestamp detection
    const isDateLike =
      strValue.length >= 19 &&
      (strValue.includes("T") || strValue.includes(" ")) &&
      !isNaN(Date.parse(strValue));

    if (isDateLike) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-xs text-foreground/80 cursor-default truncate max-w-[200px] block">
              {strValue}
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-xs font-mono">
            Full timestamp: {strValue}
          </TooltipContent>
        </Tooltip>
      );
    }

    // Default string rendering with hover copy button
    return (
      <div className="group/cell flex items-center justify-between gap-1 max-w-[340px]">
        <span className="text-xs text-foreground/90 truncate block" title={strValue}>
          {strValue}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copyCellValue(cellKey, value);
          }}
          aria-label="Copy cell value"
          className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-opacity shrink-0"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-signal" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    );
  };

  const activeSortCol = isServerSide ? sortColumn : localSortCol;
  const activeSortOrder = isServerSide ? sortOrder : localSortOrder;

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
      {/* Table Toolbar Header */}
      <div className="flex h-10 shrink-0 select-none items-center justify-between gap-2 border-b border-border bg-card/40 px-3">
        <div className="flex items-center gap-2 truncate">
          <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {title && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-mono font-semibold text-xs text-foreground truncate" title={description}>
                {title}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                ({totalRows.toLocaleString()} rows)
              </span>
            </div>
          )}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Search */}
          {searchable && (
            <div className="relative w-44 sm:w-56">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search rows..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (!isServerSide) setLocalPage(1);
                }}
                className="h-7 rounded border-border/80 bg-card/60 pl-6 pr-6 text-xs"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="h-7 w-7 rounded p-0"
                  aria-label="Refresh table data"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin text-primary")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh table rows</TooltipContent>
            </Tooltip>
          )}

          {/* Column Visibility Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 rounded px-2 text-xs">
                <Columns3 className="w-3 h-3" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {resolvedColumns.map((col) => {
                const isChecked = !hiddenColumns.has(col.id);
                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      setHiddenColumns((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                          next.delete(col.id);
                        } else {
                          // Prevent hiding all columns
                          if (next.size < resolvedColumns.length - 1) {
                            next.add(col.id);
                          }
                        }
                        return next;
                      });
                    }}
                    className="text-xs font-mono"
                  >
                    {col.header || col.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Dropdown */}
          {exportable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 text-xs">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span>Download as CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON} className="gap-2 text-xs">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span>Download as JSON</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Table Scroll Area */}
      <div className="flex-1 overflow-auto relative">
        <Table className="border-collapse w-full">
          {/* Sticky Header with QueryForge Column Type Badges */}
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
            <TableRow className="hover:bg-transparent">
              {/* Row Index (#) column */}
              <TableHead className="w-12 px-3 py-2 text-center text-[10px] font-mono text-muted-foreground/70 uppercase border-r border-border/50 sticky left-0 bg-card/95 z-20">
                #
              </TableHead>

              {/* Data Columns */}
              {visibleColumns.map((col) => {
                const typePill = formatDataType(col.dataType);
                const colorClass = getDataTypeColor(typePill);
                const isSorted = activeSortCol === col.id;

                return (
                  <TableHead
                    key={col.id}
                    className="px-4 py-2 border-r border-border/40 last:border-r-0 select-none group/th"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => col.sortable !== false && handleSort(col.id)}
                        className={cn(
                          "flex items-center gap-1.5 cursor-pointer font-medium text-xs",
                          col.sortable !== false && "hover:text-foreground"
                        )}
                      >
                        {/* Primary Key indicator */}
                        {col.isPrimaryKey && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Key className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Primary Key</TooltipContent>
                          </Tooltip>
                        )}

                        {/* Foreign Key indicator */}
                        {col.isForeignKey && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link2 className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Foreign Key Reference</TooltipContent>
                          </Tooltip>
                        )}

                        <span className="font-semibold text-foreground/90 tracking-tight">
                          {col.header || col.id}
                        </span>

                        {/* QueryForge Data Type Badge */}
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded text-[10px] font-mono border",
                            colorClass
                          )}
                        >
                          {typePill}
                        </span>
                      </div>

                      {/* Sort Icon */}
                      {col.sortable !== false && (
                        <button
                          type="button"
                          onClick={() => handleSort(col.id)}
                          aria-label={`Sort by ${col.header || col.id}`}
                          className="text-muted-foreground/60 hover:text-foreground p-0.5 rounded transition-colors"
                        >
                          {isSorted ? (
                            activeSortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </button>
                      )}
                    </div>
                  </TableHead>
                );
              })}

              {/* Row Inspect action column */}
              <TableHead className="w-10 px-2 py-2 text-center text-muted-foreground">
                <span className="sr-only">Inspect</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 2}
                  className="h-64 text-center p-8"
                >
                  <div className="flex flex-col items-center justify-center text-destructive space-y-2">
                    <p className="text-sm font-semibold">{error}</p>
                    {onRefresh && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="mt-2 text-xs"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 8 }).map((_, rIdx) => (
                <TableRow key={rIdx} className="hover:bg-transparent">
                  <TableCell className="w-12 px-3 py-2.5 text-center border-r border-border/50 sticky left-0 bg-card">
                    <div className="h-3 w-4 bg-muted/60 rounded animate-pulse mx-auto" />
                  </TableCell>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id} className="px-4 py-2.5 border-r border-border/40 last:border-r-0">
                      <div className="h-3.5 bg-muted/50 rounded animate-pulse w-3/4" />
                    </TableCell>
                  ))}
                  <TableCell className="w-10 px-2 py-2.5" />
                </TableRow>
              ))
            ) : displayRows.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 2}
                  className="h-64 text-center p-8"
                >
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <Layers className="w-8 h-8 text-muted-foreground/50 mb-1" />
                    <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {localSearch
                        ? `No matching records found for query "${localSearch}". Try clearing your search.`
                        : "This database table currently does not contain any records."}
                    </p>
                    {localSearch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocalSearch("")}
                        className="mt-2 text-xs"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              displayRows.map((row, rowIdx) => {
                const rowIndexNumber = (currentPage - 1) * currentPageSize + rowIdx + 1;

                return (
                  <TableRow
                    key={rowIdx}
                    onClick={() => setInspectedRow(row)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group/row"
                  >
                    {/* Sticky Row Index # */}
                    <TableCell className="w-12 px-3 py-2 text-center text-[11px] font-mono text-muted-foreground/80 border-r border-border/50 sticky left-0 bg-card group-hover/row:bg-muted/40 z-10">
                      {rowIndexNumber}
                    </TableCell>

                    {/* Column Cells */}
                    {visibleColumns.map((col) => {
                      const val = row[col.accessorKey || col.id];
                      return (
                        <TableCell
                          key={col.id}
                          className="px-4 py-2 border-r border-border/40 last:border-r-0"
                        >
                          {renderCellContent(row, col, val, rowIdx)}
                        </TableCell>
                      );
                    })}

                    {/* Quick View Button */}
                    <TableCell className="w-10 px-2 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedRow(row);
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                        aria-label="Inspect row details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="h-8 px-3 border-t border-border bg-card/40 flex items-center justify-between gap-2 text-xs text-muted-foreground shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span>
            Showing{" "}
            <span className="font-mono font-medium text-foreground">
              {totalRows === 0 ? 0 : (currentPage - 1) * currentPageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-mono font-medium text-foreground">
              {Math.min(currentPage * currentPageSize, totalRows)}
            </span>{" "}
            of{" "}
            <span className="font-mono font-medium text-foreground">
              {totalRows.toLocaleString()}
            </span>{" "}
            rows
          </span>

          <span className="text-border">•</span>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows per page:</span>
            <select
              value={currentPageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="bg-background border border-border rounded px-2 py-0.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Page Navigation Controls */}
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1 || isLoading}
            className="h-7 w-7 p-0"
            aria-label="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="h-7 w-7 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <span className="px-2 font-mono text-xs">
            Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            className="h-7 w-7 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages || isLoading}
            className="h-7 w-7 p-0"
            aria-label="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Row Record Detail Dialog */}
      <Dialog open={Boolean(inspectedRow)} onOpenChange={(open) => !open && setInspectedRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-display font-bold text-foreground">
                  Record Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Inspect full JSON attributes for selected database row
                </DialogDescription>
              </div>
              {inspectedRow && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(JSON.stringify(inspectedRow, null, 2));
                    toast.success("Copied record JSON to clipboard");
                  }}
                  className="text-xs gap-1.5 h-8 mr-6"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          {inspectedRow && (
            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border/60">
                {Object.entries(inspectedRow).map(([key, value]) => {
                  const matchingCol = resolvedColumns.find((c) => c.id === key);
                  const typePill = formatDataType(matchingCol?.dataType);

                  return (
                    <div key={key} className="p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {key}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                          {typePill}
                        </span>
                      </div>

                      <div className="font-mono text-xs text-foreground/90 break-all sm:text-right max-w-md">
                        {value === null || value === undefined ? (
                          <span className="italic text-muted-foreground/60">NULL</span>
                        ) : typeof value === "object" ? (
                          <pre className="text-[11px] bg-background/80 p-2 rounded border border-border overflow-x-auto text-left">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          String(value)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
