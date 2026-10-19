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
import { Database, Trash2, ChevronRight } from "lucide-react";

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

  const handleConfirmDelete = async () => {
    if (!connectionToDelete) return;
    const target = connectionToDelete;
    setIsDeleting(true);

    try {
      const success = await onDeleteConnection(target.id);
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
    <div className="w-full flex-1 flex flex-col p-6 min-h-0 overflow-auto">
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">Database Name</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">Host</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">Port</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">Database</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">Username</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">SSL Mode</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-foreground/80">Status</TableHead>
              <TableHead className="font-semibold text-xs py-2.5 px-4 text-right text-foreground/80">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.map((conn) => (
              <TableRow
                key={conn.id}
                onClick={() => onSelectConnection(conn)}
                className="cursor-pointer hover:bg-muted/30 transition-colors group border-b border-border/60"
                title={`Click to open ${conn.name}`}
              >
                <TableCell className="py-2.5 px-4 font-medium text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground group-hover:underline underline-offset-2 transition-colors block">
                        {conn.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Click to access tables & schema
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                  {conn.host}
                </TableCell>
                <TableCell className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                  {conn.port}
                </TableCell>
                <TableCell className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                  {conn.database}
                </TableCell>
                <TableCell className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                  {conn.username}
                </TableCell>
                <TableCell className="py-2.5 px-4">
                  <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase">
                    {conn.ssl_mode}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5 px-4">
                  <Badge
                    variant={conn.status === "ACTIVE" ? "emerald" : "amber"}
                    size="sm"
                    className="gap-1.5 font-mono text-[10px]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {conn.status}
                  </Badge>
                </TableCell>
                <TableCell
                  className="py-2.5 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectConnection(conn)}
                      className="text-xs h-7 px-2 text-foreground hover:bg-muted font-medium gap-1"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setConnectionToDelete(conn)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7 rounded-md"
                      aria-label={`Delete connection ${conn.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog for Deletion */}
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
              Are you sure you want to disconnect <span className="font-semibold text-foreground font-mono">&quot;{connectionToDelete?.name}&quot;</span>?
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
