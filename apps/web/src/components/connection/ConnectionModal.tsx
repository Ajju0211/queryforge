"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner";
import { PresetSelector } from "./PresetSelector";
import { ConnectionForm } from "./ConnectionForm";
import { ConnectionTestBadge } from "./ConnectionTestBadge";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { useConnectionTest } from "@/domain/connection/hooks/useConnectionTest";
import {
  validateConnectionPayload,
  mapErrorCategoryToField,
  ConnectionFieldErrors,
} from "@/domain/connection/models/connection.validation";
import { Database, Zap, ArrowRight, AlertCircle } from "lucide-react";
import { LogoIcon } from "@/components/ui/Logo";

export function ConnectionModal() {
  const {
    connections,
    isModalOpen,
    closeModal,
    selectedPreset,
    setSelectedPreset,
    formData,
    updateFormField,
    saveConnection,
    isSavingConnection,
    errorMessage,
  } = useConnectionManager();

  const { isTesting, testResult, runTest, resetTest } = useConnectionTest();
  const [fieldErrors, setFieldErrors] = useState<ConnectionFieldErrors>({});

  const handlePresetChange = (preset: typeof selectedPreset) => {
    setSelectedPreset(preset);
    setFieldErrors({});
    resetTest();
  };

  const handleTest = async () => {
    // 1. Validate fields required for connection probe
    const errors = validateConnectionPayload(formData, selectedPreset, connections);
    // Ignore 'name' and duplicate database for probe test since probe only tests database reachability
    const probeErrors: ConnectionFieldErrors = { ...errors };
    delete probeErrors.name;
    delete probeErrors.database;

    if (Object.keys(probeErrors).length > 0) {
      setFieldErrors(probeErrors);
      const firstError = Object.values(probeErrors)[0];
      toast.error("Validation Error", {
        description: firstError || "Please check the highlighted fields.",
      });
      return;
    }

    setFieldErrors({});
    const res = await runTest(formData);
    if (res.success) {
      toast.success("Connection Successful!", {
        description: `PostgreSQL responded in ${res.latency_ms ?? 0}ms and credentials are verified.`,
      });
    } else {
      if (res.error_category) {
        const mapped = mapErrorCategoryToField(res.error_category);
        if (mapped) {
          setFieldErrors((prev) => ({
            ...prev,
            [mapped.field]: mapped.message,
          }));
        }
      }
      toast.error("Connection Failed", {
        description: res.message || "Target database did not respond. Check error details below.",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Comprehensive client validation including duplicate checks
    const errors = validateConnectionPayload(formData, selectedPreset, connections);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error("Form Incomplete", {
        description: firstError || "Please resolve the highlighted fields.",
      });
      return;
    }

    setFieldErrors({});
    const res = await saveConnection();
    if (res.success) {
      toast.success("Database Connected!", {
        description: `Successfully connected and introspected "${formData.name}".`,
      });
      closeModal();
    } else {
      if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
        setFieldErrors(res.fieldErrors);
      } else if (res.category) {
        const mapped = mapErrorCategoryToField(res.category);
        if (mapped) {
          setFieldErrors((prev) => ({
            ...prev,
            [mapped.field]: mapped.message,
          }));
        }
      } else if (res.message) {
        const lowerMsg = res.message.toLowerCase();
        if (lowerMsg.includes("connection named") || lowerMsg.includes("choose a different name")) {
          setFieldErrors((prev) => ({ ...prev, name: res.message }));
        } else if (lowerMsg.includes("already connected")) {
          setFieldErrors((prev) => ({ ...prev, database: res.message }));
        }
      }
      toast.error("Connection Rejected", {
        description: res.message || errorMessage || "Please check your network and credentials.",
      });
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[480px] max-h-[88vh] overflow-y-auto rounded-lg bg-card border-border shadow-xl p-5">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <LogoIcon size={18} glow={false} />
            <DialogTitle className="text-sm font-semibold font-display text-foreground tracking-tight">
              Connect PostgreSQL Database
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter credentials to connect and explore database schemas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-3 mt-1" noValidate>
          {/* Presets: Local DB, Cloud DB, Custom */}
          <PresetSelector
            selectedPreset={selectedPreset}
            onSelectPreset={handlePresetChange}
          />

          {/* Form Inputs with Inline Errors */}
          <ConnectionForm
            formData={formData}
            errors={fieldErrors}
            onChangeField={(key, val) => {
              updateFormField(key, val);
              if (fieldErrors[key]) {
                setFieldErrors((prev) => {
                  const updated = { ...prev };
                  delete updated[key];
                  return updated;
                });
              }
              if (testResult) resetTest();
            }}
            disabled={isSavingConnection || isTesting}
          />

          {/* Diagnostic Test Probe Result */}
          <ConnectionTestBadge result={testResult} />

          {/* Global Error Banner using shadcn Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="rounded-md py-2 px-3">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle className="font-semibold text-xs">Connection Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed opacity-95">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              isLoading={isTesting}
              disabled={isSavingConnection}
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Test Connection</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeModal}
                disabled={isSavingConnection || isTesting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingConnection}
                disabled={isTesting}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Connect & Introspect</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


