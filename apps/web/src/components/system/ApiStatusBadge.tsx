"use client";

import React from "react";
import { useApiHealth } from "@/domain/system/hooks/useApiHealth";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, RefreshCw } from "lucide-react";

export function ApiStatusBadge() {
  const { isChecking, isOnline, health, checkHealth } = useApiHealth();

  if (isChecking && !health) {
    return (
      <Badge variant="outline" size="sm" className="font-mono text-[11px] gap-1.5 py-1 px-3">
        <RefreshCw className="w-3 h-3 animate-spin text-primary" />
        <span>Connecting API...</span>
      </Badge>
    );
  }

  if (isOnline && health) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-default">
            <Badge variant="outline" size="sm" className="font-mono text-[10px] gap-1.5 py-0.5 px-2 bg-card border-border text-foreground">
              <span className="relative flex h-1.5 w-1.5 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="font-medium">API Online</span>
              <span className="text-muted-foreground text-[10px]">({health.latencyMs}ms)</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {health.service} v{health.version} ({health.environment})
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => checkHealth()}
          className="cursor-pointer"
        >
          <Badge variant="destructive" size="sm" className="font-mono text-[11px] gap-1.5 py-1 px-3 hover:opacity-80 transition-opacity">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>API Offline</span>
            <span className="text-[10px] underline ml-0.5 opacity-80">retry</span>
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Backend API is unreachable. Click to retry connection.
      </TooltipContent>
    </Tooltip>
  );
}
