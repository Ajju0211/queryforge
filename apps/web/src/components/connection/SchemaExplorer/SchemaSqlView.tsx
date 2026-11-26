"use client";

import React, { useState } from "react";
import { TableMetadata } from "@/domain/connection/models/connection.types";
import { generateTableDDL } from "@/domain/connection/utils/schema-ddl";
import { Copy, Check, FileCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/sonner";

interface SchemaSqlViewProps {
  table: TableMetadata;
}

export function SchemaSqlView({ table }: SchemaSqlViewProps) {
  const [copied, setCopied] = useState(false);
  const sql = generateTableDDL(table);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`Copied SQL for "${table.name}"`);
  };

  const lines = sql.split("\n");

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
            PostgreSQL DDL
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground/70">
            {table.schema || "public"}.{table.name}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="text-xs h-6.5 px-2 gap-1.5 font-mono cursor-pointer rounded"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
          <span>{copied ? "Copied" : "Copy SQL"}</span>
        </Button>
      </div>

      <div className="flex-1 mt-3 rounded border border-border/70 bg-card/50 p-3 font-mono text-xs overflow-auto select-all">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-muted/30">
                <td className="w-8 pr-4 text-right text-muted-foreground/40 select-none font-mono text-[11px] align-top py-0.5">
                  {idx + 1}
                </td>
                <td className="text-foreground whitespace-pre py-0.5">
                  {line}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
