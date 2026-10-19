"use client";

import React from "react";
import { ConnectionTestResult } from "@/domain/connection/models/connection.types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface ConnectionTestBadgeProps {
  result: ConnectionTestResult | null;
}

export function ConnectionTestBadge({ result }: ConnectionTestBadgeProps) {
  if (!result) return null;

  if (result.success) {
    return (
      <Alert className="border-emerald-500/25 bg-emerald-500/10 text-emerald-400 rounded-md flex items-center justify-between py-2 px-3 animate-in fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <AlertTitle className="font-medium text-xs text-emerald-400 m-0">
            Connection verified successfully!
          </AlertTitle>
        </div>
        {result.latency_ms !== null && result.latency_ms !== undefined && (
          <Badge variant="outline" size="sm" className="font-mono text-emerald-400 border-emerald-500/30">
            <Clock className="w-3 h-3 mr-1" />
            {result.latency_ms} ms
          </Badge>
        )}
      </Alert>
    );
  }

  const categoryLabels: Record<string, string> = {
    authentication: "Authentication Failure",
    unreachable: "Host Unreachable",
    ssl_mismatch: "SSL / TLS Mismatch",
    database_not_found: "Database Not Found",
    catalog_permission: "Catalog Permissions",
  };

  const categoryAdvice: Record<string, string> = {
    authentication: "Verify your username and password. Cloud databases require the exact database user credentials.",
    unreachable: "Database server did not respond. Check hostname, port, and firewall. In Docker, use 'host.docker.internal'.",
    ssl_mismatch: "SSL handshake failed. Try switching SSL Mode to 'require' (common for cloud) or 'disable' (local).",
    database_not_found: "The database name does not exist on this server. Check for typos in the database name.",
    catalog_permission: "User lacks permission to inspect pg_catalog tables. Grant SELECT on pg_catalog to this user.",
  };

  const categoryTitle =
    result.error_category && categoryLabels[result.error_category]
      ? categoryLabels[result.error_category]
      : "Connection Failed";

  const advice =
    result.error_category && categoryAdvice[result.error_category]
      ? categoryAdvice[result.error_category]
      : null;

  return (
    <Alert variant="destructive" className="rounded-md py-2 px-3 animate-in fade-in">
      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <AlertTitle className="font-semibold text-xs leading-none">{categoryTitle}</AlertTitle>
        <AlertDescription className="text-[11px] leading-relaxed opacity-90">
          {result.message}
        </AlertDescription>
        {advice && (
          <p className="text-[10px] text-destructive-foreground/80 font-medium pt-1 border-t border-destructive/20 mt-1.5">
            <span className="font-semibold">Tip:</span> {advice}
          </p>
        )}
      </div>
    </Alert>
  );
}
