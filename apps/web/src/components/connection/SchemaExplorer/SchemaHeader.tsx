"use client";

import React from "react";
import { ConnectionEntity } from "@/domain/connection/models/connection.types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Database, Layers, Shield, Search } from "lucide-react";

import { toast } from "@/components/ui/sonner";

interface SchemaHeaderProps {
  connection: ConnectionEntity | null;
  databaseName?: string;
  introspectedAt?: string;
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    totalTables: number;
    totalColumns: number;
    totalEstimatedRows: number;
    excludedCount: number;
  };
}

export function SchemaHeader({
  connection,
  databaseName,
  introspectedAt,
  isRefreshing,
  onRefresh,
  searchQuery,
  onSearchChange,
  stats,
}: SchemaHeaderProps) {
  if (!connection) return null;

  const handleRefresh = async () => {
    try {
      await onRefresh();
      toast.success("Schema Refreshed", {
        description: `Catalogs updated for ${connection.name}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh schema.";
      toast.error("Introspection Error", { description: msg });
    }
  };

  const formattedDate = introspectedAt
    ? new Date(introspectedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    : "Not introspected";

  return (
    <div className="flex flex-col gap-4 p-5 border-b border-border bg-card/60 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-display font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span>{connection.name}</span>
            </h1>
            <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase text-muted-foreground border-border">
              <Shield className="w-3 h-3 mr-0.5" />
              <span>{connection.ssl_mode}</span>
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {connection.username}@{connection.host}:{connection.port}/
            <span className="text-foreground font-semibold">
              {databaseName || connection.database}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
              Last Introspected
            </span>
            <span className="text-xs font-mono text-foreground/80">{formattedDate}</span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                isLoading={isRefreshing}
                className="text-xs h-7.5 rounded-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh Schema</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh database schema catalogs</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats bar and Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
          <Badge variant="outline" size="md" className="gap-1.5 py-1 px-2.5">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{stats.totalTables}</span>
            <span>tables</span>
          </Badge>

          <Badge variant="outline" size="md" className="gap-1.5 py-1 px-2.5 font-mono">
            <span className="font-semibold text-foreground">{stats.totalColumns}</span>
            <span>columns</span>
          </Badge>

          {stats.excludedCount > 0 && (
            <Badge variant="amber" size="md" className="gap-1 py-1 px-2.5">
              <span>{stats.excludedCount} excluded from AI</span>
            </Badge>
          )}
        </div>

        {/* Search Filter Input with shadcn Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search tables or columns..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-7.5 pl-8 pr-3 text-xs rounded-md bg-muted/60 border-border"
          />
        </div>
      </div>
    </div>
  );
}
