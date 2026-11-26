"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ConnectionEntity } from "@/domain/connection/models/connection.types";
import { GraphFilterState } from "@/domain/schema-graph/types";
import {
  Database,
  Search,
  X,
  Layers,
  Crosshair,
  GitFork,
  ArrowRightLeft,
  ArrowUpDown,
  Maximize2,
  Unlink,
  ChevronDown,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SchemaGraphToolbarProps {
  connections: ConnectionEntity[];
  activeConnection: ConnectionEntity | null;
  filterState: GraphFilterState;
  availableSchemas: string[];
  visibleCount: number;
  totalCount: number;
  onFilterChange: (updates: Partial<GraphFilterState>) => void;
  onFitView: () => void;
  onResetNeighborhood: () => void;
}

export function SchemaGraphToolbar({
  connections,
  activeConnection,
  filterState,
  availableSchemas,
  visibleCount,
  totalCount,
  onFilterChange,
  onFitView,
  onResetNeighborhood,
}: SchemaGraphToolbarProps) {
  const router = useRouter();

  return (
    <div className="z-30 flex min-h-12 shrink-0 select-none flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-background/90 px-3 py-2 backdrop-blur-md sm:px-4 xl:flex-nowrap xl:py-0">
      {/* Left: Database Switcher & Mode Segmented Control */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* Database Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer gap-2 border-border/80 bg-card/60 px-2.5 text-xs font-semibold hover:bg-card"
            >
              <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-[100px] truncate sm:max-w-[140px]">
                {activeConnection?.name || "Select database"}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="font-mono text-[11px] text-muted-foreground">
              Connected databases
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {connections.map((conn) => (
              <DropdownMenuItem
                key={conn.id}
                onClick={() => router.push(`/project/${conn.id}/graph`)}
                className={cn(
                  "flex cursor-pointer items-center justify-between py-1.5",
                  conn.id === activeConnection?.id && "bg-muted font-semibold"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{conn.name}</span>
                </div>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {conn.database}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border/60" />

        {/* Mode Selector */}
        <div className="flex items-center rounded-md border border-border/70 bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => onFilterChange({ mode: "neighborhood" })}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              filterState.mode === "neighborhood"
                ? "bg-card font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Focus on a table and its 1-hop connected neighbors"
          >
            <Crosshair className="h-3 w-3" />
            <span className="hidden xl:inline">Neighborhood</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ mode: "schema" })}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              filterState.mode === "schema"
                ? "bg-card font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Filter by PostgreSQL schema"
          >
            <Layers className="h-3 w-3" />
            <span className="hidden xl:inline">Schema</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ mode: "full" })}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              filterState.mode === "full"
                ? "bg-card font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Show all tables across entire database"
          >
            <GitFork className="h-3 w-3" />
            <span className="hidden xl:inline">All tables</span>
          </button>
        </div>

        {/* Schema Dropdown (if mode is schema or available) */}
        {availableSchemas.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer gap-1.5 border-border/80 bg-card/60 px-2 font-mono text-xs hover:bg-card"
              >
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[90px] truncate sm:max-w-none">
                  {filterState.selectedSchema === "all"
                    ? "All schemas"
                    : filterState.selectedSchema}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 font-mono text-xs">
              <DropdownMenuItem
                onClick={() => onFilterChange({ selectedSchema: "all" })}
                className="cursor-pointer"
              >
                All schemas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableSchemas.map((sch) => (
                <DropdownMenuItem
                  key={sch}
                  onClick={() => onFilterChange({ selectedSchema: sch })}
                  className={cn(
                    "cursor-pointer",
                    filterState.selectedSchema === sch && "bg-muted font-semibold"
                  )}
                >
                  {sch}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Center: Search Tables */}
      <div className="relative order-3 min-w-[140px] flex-1 basis-full xl:order-none xl:max-w-xs xl:basis-auto">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tables or columns..."
          value={filterState.searchQuery}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          className="h-8 border-border/80 bg-card/50 pl-8 pr-7 font-mono text-xs focus-visible:ring-1"
        />
        {filterState.searchQuery && (
          <button
            type="button"
            onClick={() => onFilterChange({ searchQuery: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Right: Actions, Filters & View Options */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Visible Tables Badge */}
        <div className="hidden items-center gap-1 font-mono text-[11px] text-muted-foreground lg:flex">
          <span className="font-semibold text-foreground">{visibleCount}</span>
          <span>of {totalCount} tables</span>
        </div>

        {/* Hide Orphans Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFilterChange({ hideOrphans: !filterState.hideOrphans })}
              className={cn(
                "h-8 cursor-pointer gap-1.5 border-border/80 px-2 text-xs font-medium",
                filterState.hideOrphans
                  ? "border-border bg-muted font-semibold text-foreground shadow-2xs"
                  : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <Unlink className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {filterState.hideOrphans ? "Orphans hidden" : "Hide orphans"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Hide standalone tables that have zero foreign key relationships
          </TooltipContent>
        </Tooltip>

        {/* Reset Neighborhood Focus Button (if focused or expanded) */}
        {(filterState.focusTable || filterState.expandedTables.length > 0) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onResetNeighborhood}
                className="h-8 cursor-pointer gap-1.5 border-border/80 bg-card/60 px-2 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Reset focus</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear focused table and expanded nodes</TooltipContent>
          </Tooltip>
        )}

        {/* Layout Direction Toggle (LR vs TB) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onFilterChange({
                  layoutDirection: filterState.layoutDirection === "LR" ? "TB" : "LR",
                })
              }
              className="h-8 w-8 cursor-pointer border-border/80 bg-card/60 p-0 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              {filterState.layoutDirection === "LR" ? (
                <ArrowRightLeft className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Layout: {filterState.layoutDirection === "LR" ? "Left to right" : "Top to bottom"}
          </TooltipContent>
        </Tooltip>

        {/* Compact View Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFilterChange({ isCompactView: !filterState.isCompactView })}
              className={cn(
                "h-8 w-8 cursor-pointer border-border/80 p-0",
                filterState.isCompactView
                  ? "bg-muted text-foreground"
                  : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              {filterState.isCompactView ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Toggle compact level of detail
          </TooltipContent>
        </Tooltip>

        {/* Reset / Center View */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onFitView}
              className="h-8 cursor-pointer gap-1 border-border/80 bg-card/60 px-2 text-xs text-foreground hover:bg-card"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Fit view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Fit entire diagram in viewport</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
