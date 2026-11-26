"use client";

import React, { useState } from "react";
import { ConnectionEntity } from "@/domain/connection/models/connection.types";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Database, Trash2, ChevronRight, Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DatabaseTableProps {
  connections: ConnectionEntity[];
  onSelectConnection: (conn: ConnectionEntity) => void;
  onDeleteConnection: (id: string) => Promise<boolean>;
  errorMessage: string | null;
}

export function DatabaseTable({
  connections,
  onSelectConnection,
  onDeleteConnection,
  errorMessage,
}: DatabaseTableProps) {
  const [connectionToDelete, setConnectionToDelete] = useState<ConnectionEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyHost = (conn: ConnectionEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    const str = `${conn.username}@${conn.host}:${conn.port}/${conn.database}`;
    navigator.clipboard.writeText(str);
    setCopiedId(conn.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Connection string copied", { description: str });
  };

  const getStatusBadge = (status: ConnectionEntity["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="emerald" size="sm" className="gap-1.5 font-mono text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
            ACTIVE
          </Badge>
        );
      case "INTROSPECTION_FAILED":
        return (
          <Badge variant="amber" size="sm" className="gap-1.5 font-mono text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            ATTENTION
          </Badge>
        );
      case "UNREACHABLE":
        return (
          <Badge variant="red" size="sm" className="gap-1.5 font-mono text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            OFFLINE
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" className="gap-1.5 font-mono text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {status}
          </Badge>
        );
    }
  };

  const handleConfirmDelete = async () => {
    if (!connectionToDelete) return;
    const target = connectionToDelete;
    setIsDeleting(true);

    try {
      const success = await onDeleteConnection(target.id);
      setIsDeleting(false);
      setConnectionToDelete(null);

      if (success) {
        toast.success("Connection removed", {
          description: `Deleted "${target.name}".`,
        });
      } else {
        toast.error("Connection not deleted", {
          description: errorMessage || "Could not delete connection from database.",
        });
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      setConnectionToDelete(null);
      const msg = err instanceof Error ? err.message : "Failed to delete connection.";
      toast.error("Delete error", { description: msg });
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
      <Table className="min-w-[720px]">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="h-9 px-4 text-[11px] font-medium text-muted-foreground">
              Connection
            </TableHead>
            <TableHead className="h-9 px-4 text-[11px] font-medium text-muted-foreground">
              Host
            </TableHead>
            <TableHead className="h-9 px-4 text-[11px] font-medium text-muted-foreground">
              Database
            </TableHead>
            <TableHead className="h-9 px-4 text-[11px] font-medium text-muted-foreground">
              User
            </TableHead>
            <TableHead className="h-9 px-4 text-[11px] font-medium text-muted-foreground">
              SSL
            </TableHead>
            <TableHead className="h-9 px-4 text-[11px] font-medium text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="h-9 px-4 text-right text-[11px] font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((conn) => (
            <TableRow
              key={conn.id}
              onClick={() => onSelectConnection(conn)}
              className="group h-13 cursor-pointer border-b border-border/60 transition-all duration-150 hover:bg-muted/40"
              title={`Open ${conn.name}`}
            >
              <TableCell className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors group-hover:text-foreground group-hover:border-foreground/30">
                    <Database className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="truncate text-[13px] font-semibold text-foreground group-hover:text-primary">
                      {conn.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground font-mono">
                      PostgreSQL
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-2.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                {conn.host}:{conn.port}
              </TableCell>
              <TableCell className="px-4 py-2.5 font-mono text-[12px] font-medium text-foreground">
                {conn.database}
              </TableCell>
              <TableCell className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">
                {conn.username}
              </TableCell>
              <TableCell className="px-4 py-2.5">
                <Badge
                  variant="outline"
                  size="sm"
                  className="font-mono text-[10px] tracking-wide uppercase"
                >
                  {conn.ssl_mode}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-2.5">
                {getStatusBadge(conn.status)}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => handleCopyHost(conn, e)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label="Copy connection string"
                      >
                        {copiedId === conn.id ? (
                          <Check className="h-3.5 w-3.5 text-signal" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Copy connection string</TooltipContent>
                  </Tooltip>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectConnection(conn)}
                    className="h-7.5 gap-1 px-2.5 text-[12px] font-medium text-foreground hover:bg-muted"
                  >
                    <span>Open</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setConnectionToDelete(conn)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete connection ${conn.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete connection</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Confirmation Dialog for Deletion */}
      <Dialog
        open={Boolean(connectionToDelete)}
        onOpenChange={(open) => !open && setConnectionToDelete(null)}
      >
        <DialogContent className="p-5 sm:max-w-md">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="font-display text-base font-semibold text-foreground">
              Delete database connection?
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              This removes{" "}
              <span className="font-mono font-medium text-foreground">
                &quot;{connectionToDelete?.name}&quot;
              </span>{" "}
              and its cached schema from QueryForge. The database itself is not
              changed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
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
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete connection</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
