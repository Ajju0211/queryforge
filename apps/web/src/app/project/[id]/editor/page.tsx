"use client";

import { useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { SqlEditorWorkspace } from "@/components/sql-editor";
import { Loader2 } from "lucide-react";

function SqlEditorPageContent() {
  const params = useParams();
  const connectionId = params?.id as string;

  const { activeConnection, selectConnection, isLoadingSchema } =
    useConnectionManager();

  useEffect(() => {
    if (connectionId && (!activeConnection || activeConnection.id !== connectionId)) {
      selectConnection(connectionId);
    }
  }, [connectionId, activeConnection, selectConnection]);

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-background">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isLoadingSchema && !activeConnection ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-2 text-xs font-mono">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Connecting to database...</span>
          </div>
        ) : (
          <SqlEditorWorkspace />
        )}
      </main>
    </div>
  );
}

export default function SqlEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground gap-2 text-xs font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Loading SQL Editor...</span>
        </div>
      }
    >
      <SqlEditorPageContent />
    </Suspense>
  );
}