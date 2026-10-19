"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ConnectionEntity } from "@/domain/connection/models/connection.types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Database, Trash2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface ConnectionCardProps {
  connection: ConnectionEntity;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRequestDelete: (connection: ConnectionEntity) => void;
}

export function ConnectionCard({
  connection,
  isActive,
  onSelect,
  onRequestDelete,
}: ConnectionCardProps) {
  const statusVariants: Record<
    string,
    { variant: "emerald" | "amber" | "red" | "neutral"; icon: React.ReactNode }
  > = {
    ACTIVE: {
      variant: "emerald",
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    },
    INTROSPECTION_FAILED: {
      variant: "amber",
      icon: <AlertCircle className="w-3 h-3 text-amber-400" />,
    },
    UNREACHABLE: {
      variant: "red",
      icon: <XCircle className="w-3 h-3 text-red-400" />,
    },
    DISABLED: {
      variant: "neutral",
      icon: <Database className="w-3 h-3 text-muted-foreground" />,
    },
  };

  const statusConfig = statusVariants[connection.status] || {
    variant: "neutral",
    icon: <Database className="w-3 h-3 text-muted-foreground" />,
  };

  return (
    <Card
      onClick={() => onSelect(connection.id)}
      className={cn(
        "group relative flex items-center justify-between p-3 rounded-lg border transition-all duration-150 cursor-pointer select-none",
        isActive
          ? "border-foreground/30 bg-card shadow-xs"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "p-2 rounded-md shrink-0 transition-colors",
            isActive
              ? "bg-muted text-foreground border border-border"
              : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Database className="w-4 h-4" />
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-display font-semibold truncate",
                isActive ? "text-foreground font-bold" : "text-foreground/90"
              )}
            >
              {connection.name}
            </span>
            <Badge variant={statusConfig.variant} size="sm">
              {statusConfig.icon}
              <span className="capitalize text-[10px]">{connection.status.toLowerCase()}</span>
            </Badge>
          </div>

          <p className="text-[11px] text-muted-foreground font-mono truncate">
            {connection.username}@{connection.host}:{connection.port}/{connection.database}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(connection);
              }}
              className="opacity-0 group-hover:opacity-100 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
              aria-label="Delete connection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete connection</TooltipContent>
        </Tooltip>

        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
        )}
      </div>
    </Card>
  );
}
