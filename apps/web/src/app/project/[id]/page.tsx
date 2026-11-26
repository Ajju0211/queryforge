"use client";

import { useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { SchemaExplorer } from "@/components/connection/SchemaExplorer";
import { Loader2 } from "lucide-react";

function WorkspaceContent() {
  const params = useParams();
  const connectionId = params?.id as string;

  const {
    activeConnection,
    selectConnection,
    isLoadingSchema,
  } = useConnectionManager();

  useEffect(() => {
    if (connectionId && (!activeConnection || activeConnection.id !== connectionId)) {
      selectConnection(connectionId);
    }
  }, [connectionId, activeConnection, selectConnection]);

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-background">
      {/* Main Workspace: QueryForge Schema Explorer (Tables, Columns, Inspector) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isLoadingSchema && !activeConnection ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span>Connecting to database and introspecting tables...</span>
          </div>
        ) : (
          <SchemaExplorer />
        )}
      </main>
    </div>
  );
}

export default function DatabaseWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground gap-2 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span>Loading workspace...</span>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
