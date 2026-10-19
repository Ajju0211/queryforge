"use client";

import React, { useState } from "react";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { ConnectionEntity } from "@/domain/connection/models/connection.types";
import { ConnectionCard } from "./ConnectionCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Plus, Database, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { LogoIcon } from "@/components/ui/Logo";

export function ConnectionList() {
  const {
    connections,
    activeConnection,
    isLoadingConnections,
    errorMessage,
    openModal,
    selectConnection,
    deleteConnection,
    refreshConnections,
  } = useConnectionManager();

  const [connectionToDelete, setConnectionToDelete] = useState<ConnectionEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = async () => {
    try {
      await refreshConnections();
      toast.success("Connections Refreshed", {
        description: `Loaded ${connections.length} database connection(s).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh connections.";
      toast.error("Refresh Failed", { description: msg });
    }
  };

  const handleConfirmDelete = async () => {
    if (!connectionToDelete) return;
    const target = connectionToDelete;
    setIsDeleting(true);

    try {
      const success = await deleteConnection(target.id);
      setIsDeleting(false);
      setConnectionToDelete(null);

      if (success) {
        toast.success("Connection Removed", {
          description: `Deleted "${target.name}".`,
        });
      } else {
        toast.error("Failed to Delete Connection", {
          description: errorMessage || "Could not delete connection from database.",
        });
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      setConnectionToDelete(null);
      const msg = err instanceof Error ? err.message : "Failed to delete connection.";
      toast.error("Delete Error", { description: msg });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-display font-semibold text-foreground tracking-tight">
            Databases
          </h2>
          <Badge variant="outline" size="sm" className="font-mono">
            {connections.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRefresh}
                className="text-muted-foreground hover:text-foreground h-7.5 w-7.5 rounded-md"
                aria-label="Refresh connection list"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isLoadingConnections ? "animate-spin text-muted-foreground" : ""
                  }`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh connection list</TooltipContent>
          </Tooltip>

          <Button
            variant="primary"
            size="sm"
            onClick={openModal}
            className="text-xs font-semibold h-7.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect</span>
          </Button>
        </div>
      </div>

      {/* Connection Cards with ScrollArea */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2 pr-2">
          {isLoadingConnections && connections.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span>Loading database connections...</span>
            </div>
          )}

          {!isLoadingConnections && connections.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-lg m-2 bg-card/40">
              <div className="p-2.5 rounded-md bg-card border border-border shadow-xs mb-3 flex items-center justify-center">
                <LogoIcon size={30} glow={false} />
              </div>
              <p className="text-xs font-display font-semibold text-foreground">No database connected</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                Connect a local PostgreSQL or cloud database to inspect tables and execute queries.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={openModal}
                className="mt-4 text-xs"
              >
                <Plus className="w-3.5 h-3.5 text-foreground" />
                <span>Add Connection</span>
              </Button>
            </div>
          )}

          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              isActive={activeConnection?.id === conn.id}
              onSelect={(id) => selectConnection(id)}
              onRequestDelete={(target) => setConnectionToDelete(target)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Clean Confirmation Dialog for Deletion */}
      <Dialog
        open={Boolean(connectionToDelete)}
        onOpenChange={(open) => !open && setConnectionToDelete(null)}
      >
        <DialogContent className="sm:max-w-md p-5 rounded-lg bg-card border-border shadow-xl">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-base font-semibold text-foreground">
              Delete Database Connection?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to disconnect <span className="font-semibold text-foreground font-mono">&quot;{connectionToDelete?.name}&quot;</span>? This will remove its cached schema catalogs from QueryForge.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConnectionToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Connection</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

