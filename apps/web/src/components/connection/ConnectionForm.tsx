"use client";

import React, { useState } from "react";
import { ConnectionCreatePayload, SSLMode } from "@/domain/connection/models/connection.types";
import { ConnectionFieldErrors } from "@/domain/connection/models/connection.validation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Info } from "lucide-react";

interface ConnectionFormProps {
  formData: ConnectionCreatePayload;
  onChangeField: <K extends keyof ConnectionCreatePayload>(
    key: K,
    value: ConnectionCreatePayload[K]
  ) => void;
  errors?: ConnectionFieldErrors;
  disabled?: boolean;
}

export function ConnectionForm({
  formData,
  onChangeField,
  errors = {},
  disabled = false,
}: ConnectionFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showCustomCa, setShowCustomCa] = useState(Boolean(formData.custom_ca_cert));

  const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"].includes(
    formData.host?.trim().toLowerCase() || ""
  );

  const sslOptions: { value: SSLMode; label: string }[] = [
    { value: "disable", label: "disable (Plaintext TCP - Local / Docker)" },
    { value: "prefer", label: "prefer (Try SSL first, fallback to TCP)" },
    { value: "require", label: "require (Enforce TLS - Supabase / Neon / RDS)" },
    { value: "verify-ca", label: "verify-ca (Verify Certificate Authority chain)" },
    { value: "verify-full", label: "verify-full (Verify CA chain and Hostname match)" },
  ];

  return (
    <div className="space-y-3">
      {/* Friendly Name */}
      <div className="space-y-1 text-left">
        <Label htmlFor="conn-name" className="text-xs font-medium text-foreground/85">
          Connection Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="conn-name"
          placeholder="e.g. Local PostgreSQL, Prod Analytics"
          value={formData.name}
          onChange={(e) => onChangeField("name", e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(errors.name)}
          className="h-8.5 rounded-md text-xs"
        />
        {errors.name && (
          <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errors.name}</span>
          </p>
        )}
      </div>

      {/* Host and Port */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2 space-y-1 text-left">
          <Label htmlFor="conn-host" className="text-xs font-medium text-foreground/85">
            Host / Endpoint <span className="text-destructive">*</span>
          </Label>
          <Input
            id="conn-host"
            placeholder="localhost or host.docker.internal"
            value={formData.host}
            onChange={(e) => onChangeField("host", e.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(errors.host)}
            className="h-8.5 rounded-md text-xs"
          />
          {errors.host && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.host}</span>
            </p>
          )}
        </div>
        <div className="space-y-1 text-left">
          <Label htmlFor="conn-port" className="text-xs font-medium text-foreground/85">
            Port <span className="text-destructive">*</span>
          </Label>
          <Input
            id="conn-port"
            type="number"
            placeholder="5432"
            value={formData.port}
            onChange={(e) => onChangeField("port", parseInt(e.target.value, 10) || 0)}
            disabled={disabled}
            aria-invalid={Boolean(errors.port)}
            className="h-8.5 rounded-md text-xs"
          />
          {errors.port && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.port}</span>
            </p>
          )}
        </div>
      </div>

      {/* Database and Username */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1 text-left">
          <Label htmlFor="conn-database" className="text-xs font-medium text-foreground/85">
            Database Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="conn-database"
            placeholder="postgres"
            value={formData.database}
            onChange={(e) => onChangeField("database", e.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(errors.database)}
            className="h-8.5 rounded-md text-xs"
          />
          {errors.database && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.database}</span>
            </p>
          )}
        </div>
        <div className="space-y-1 text-left">
          <Label htmlFor="conn-username" className="text-xs font-medium text-foreground/85">
            Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="conn-username"
            placeholder="postgres"
            value={formData.username}
            onChange={(e) => onChangeField("username", e.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(errors.username)}
            className="h-8.5 rounded-md text-xs"
          />
          {errors.username && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.username}</span>
            </p>
          )}
        </div>
      </div>

      {/* Password with visibility toggle */}
      <div className="space-y-1 text-left">
        <Label htmlFor="conn-password" className="text-xs font-medium text-foreground/85">
          Password <span className="text-destructive">*</span>
        </Label>
        <div className="relative flex items-center">
          <Input
            id="conn-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            value={formData.password}
            onChange={(e) => onChangeField("password", e.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(errors.password)}
            className="h-8.5 rounded-md text-xs pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errors.password}</span>
          </p>
        )}
      </div>

      {/* SSL Mode */}
      <div className="space-y-1 text-left">
        <Label htmlFor="conn-ssl" className="text-xs font-medium text-foreground/85">
          SSL / TLS Negotiation Mode
        </Label>
        <Select
          value={formData.ssl_mode}
          onValueChange={(val) => onChangeField("ssl_mode", val as SSLMode)}
          disabled={disabled}
        >
          <SelectTrigger
            id="conn-ssl"
            className="w-full h-8.5 rounded-md bg-card border-input text-xs"
            aria-invalid={Boolean(errors.ssl_mode)}
          >
            <SelectValue placeholder="Select SSL Mode" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border rounded-md">
            {sslOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs py-1.5">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.ssl_mode ? (
          <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errors.ssl_mode}</span>
          </p>
        ) : isLocalHost && formData.ssl_mode !== "disable" && formData.ssl_mode !== "prefer" ? (
          <p className="text-[11px] text-amber-500/95 flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
            <Info className="w-3 h-3 shrink-0 text-amber-500" />
            <span>Local Docker PostgreSQL does not support SSL. Select &apos;disable&apos; for plaintext TCP.</span>
          </p>
        ) : null}
      </div>

      {/* Expandable Custom CA Certificate */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowCustomCa(!showCustomCa)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Custom Root CA Certificate (Optional)</span>
          {showCustomCa ? (
            <ChevronUp className="w-3 h-3 ml-auto text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />
          )}
        </button>

        {showCustomCa && (
          <div className="mt-2 space-y-1 animate-in fade-in duration-150">
            <textarea
              rows={3}
              placeholder="Paste PEM root certificate (-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----)"
              value={formData.custom_ca_cert || ""}
              onChange={(e) => onChangeField("custom_ca_cert", e.target.value || null)}
              disabled={disabled}
              aria-invalid={Boolean(errors.custom_ca_cert)}
              className="w-full p-2.5 rounded-md text-xs font-mono bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/30"
            />
            {errors.custom_ca_cert && (
              <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-0.5 animate-in fade-in-50">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.custom_ca_cert}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


