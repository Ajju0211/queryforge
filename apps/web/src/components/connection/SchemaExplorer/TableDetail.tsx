"use client";

import React, { useState, useRef, useEffect } from "react";
import { TableMetadata, ColumnMetadata, ForeignKeyMetadata } from "@/domain/connection/models/connection.types";
import {
  formatColumns,
  deriveTableConstraints,
} from "@/domain/connection/utils/schema-ddl";
import {
  Lock,
  ArrowUpDown,
  Check,
  Plus,
  Trash2,
  Key,
  Edit2,
  X,
  RotateCcw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// Common PostgreSQL data types for quick selection
const COMMON_DATA_TYPES = [
  "VARCHAR(255)",
  "VARCHAR(100)",
  "TEXT",
  "INTEGER",
  "BIGINT",
  "SERIAL PRIMARY KEY",
  "BOOLEAN",
  "NUMERIC(10,2)",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "JSONB",
  "UUID",
];

interface TableDetailProps {
  table: TableMetadata;
  allTables: TableMetadata[];
  availableSchemas: string[];
  onSelectSchema?: (schema: string) => void;
  isRLSEnabled: boolean;
  onToggleRLS: (tableName: string) => void;

  // Frontend-only Mutators
  onUpdateTableName?: (oldName: string, newName: string) => void;
  onUpdateTableSchema?: (tableName: string, newSchema: string) => void;
  onAddColumn?: (tableName: string, col: ColumnMetadata) => void;
  onUpdateColumn?: (tableName: string, colName: string, updates: Partial<ColumnMetadata>) => void;
  onDeleteColumn?: (tableName: string, colName: string) => void;
  onAddConstraint?: (tableName: string, fk: ForeignKeyMetadata) => void;
  onDeleteConstraint?: (tableName: string, fkColumn: string) => void;
  onResetTable?: (tableName: string) => void;
}

export function TableDetail({
  table,
  allTables,
  availableSchemas,
  onSelectSchema,
  isRLSEnabled,
  onToggleRLS,
  onUpdateTableName,
  onUpdateTableSchema,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onAddConstraint,
  onDeleteConstraint,
  onResetTable,
}: TableDetailProps) {
  // Inline Table Name Editing State
  const [isEditingTableName, setIsEditingTableName] = useState(false);
  const [tableNameInput, setTableNameInput] = useState(table.name);
  const tableNameInputRef = useRef<HTMLInputElement>(null);

  // Inline Column Name Editing State
  const [editingColumnName, setEditingColumnName] = useState<string | null>(null);
  const [colNameInput, setColNameInput] = useState("");
  const colNameInputRef = useRef<HTMLInputElement>(null);

  // Inline Add Column Form State
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("VARCHAR(255)");
  const [newColNotNull, setNewColNotNull] = useState(false);
  const [newColIsPk, setNewColIsPk] = useState(false);
  const addColInputRef = useRef<HTMLInputElement>(null);

  // Inline Add Constraint Form State
  const [isAddingConstraint, setIsAddingConstraint] = useState(false);
  const [constraintCol, setConstraintCol] = useState(table.columns[0]?.name || "");
  const otherTables = allTables.filter((t) => t.name !== table.name);
  const [targetTableName, setTargetTableName] = useState(otherTables[0]?.name || "");
  const [targetColName, setTargetColName] = useState("id");

  useEffect(() => {
    if (isEditingTableName) {
      tableNameInputRef.current?.focus();
      tableNameInputRef.current?.select();
    }
  }, [isEditingTableName]);

  useEffect(() => {
    if (editingColumnName) {
      colNameInputRef.current?.focus();
      colNameInputRef.current?.select();
    }
  }, [editingColumnName]);

  useEffect(() => {
    if (isAddingColumn) {
      addColInputRef.current?.focus();
    }
  }, [isAddingColumn]);

  const formattedColumns = formatColumns(table.columns);
  const constraints = deriveTableConstraints(table);

  // Table Name Edit Handlers
  const handleSaveTableName = () => {
    const trimmed = tableNameInput.trim();
    if (trimmed && trimmed !== table.name) {
      onUpdateTableName?.(table.name, trimmed);
      toast.success("Table renamed", { description: `Renamed to "${trimmed}"` });
    } else {
      setTableNameInput(table.name);
    }
    setIsEditingTableName(false);
  };

  const handleTableNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTableName();
    } else if (e.key === "Escape") {
      setTableNameInput(table.name);
      setIsEditingTableName(false);
    }
  };

  // Column Name Edit Handlers
  const handleStartEditColumn = (colName: string) => {
    setEditingColumnName(colName);
    setColNameInput(colName);
  };

  const handleSaveColumnName = (oldName: string) => {
    const trimmed = colNameInput.trim();
    if (trimmed && trimmed !== oldName) {
      onUpdateColumn?.(table.name, oldName, { name: trimmed });
      toast.success("Column renamed", { description: `Renamed "${oldName}" to "${trimmed}"` });
    }
    setEditingColumnName(null);
  };

  const handleColNameKeyDown = (e: React.KeyboardEvent, oldName: string) => {
    if (e.key === "Enter") {
      handleSaveColumnName(oldName);
    } else if (e.key === "Escape") {
      setEditingColumnName(null);
    }
  };

  // Add Column Handlers
  const handleCreateColumn = () => {
    const trimmed = newColName.trim();
    if (!trimmed) {
      toast.error("Column name is required");
      return;
    }
    if (table.columns.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Column already exists", { description: `"${trimmed}" already in table.` });
      return;
    }

    const newCol: ColumnMetadata = {
      name: trimmed,
      data_type: newColType,
      nullable: !newColNotNull,
      is_primary_key: newColIsPk,
      is_foreign_key: false,
    };

    onAddColumn?.(table.name, newCol);
    toast.success(`Added column "${trimmed}"`);
    setNewColName("");
    setNewColType("VARCHAR(255)");
    setNewColNotNull(false);
    setNewColIsPk(false);
    setIsAddingColumn(false);
  };

  // Add Constraint Handlers
  const handleCreateConstraint = () => {
    if (!constraintCol || !targetTableName || !targetColName) {
      toast.error("All constraint fields are required");
      return;
    }

    const newFk: ForeignKeyMetadata = {
      column: constraintCol,
      target_table: targetTableName,
      target_column: targetColName,
    };

    onAddConstraint?.(table.name, newFk);
    toast.success(`Added foreign key on "${constraintCol}"`);
    setIsAddingConstraint(false);
  };

  const handleRLSSwitch = () => {
    onToggleRLS(table.name);
    const nextState = !isRLSEnabled;
    if (nextState) {
      toast.info(`Row Level Security enabled for "${table.name}"`);
    } else {
      toast.info(`Row Level Security disabled for "${table.name}"`);
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-5 select-text sm:p-6"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in srgb, var(--border) 32%, transparent) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* 1. Table metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Table name */}
          <div className="flex h-9 min-w-[150px] flex-col justify-center rounded-md border border-border bg-card px-2.5 py-1">
            <span className="flex items-center justify-between gap-1 font-mono text-[10px] leading-none text-muted-foreground">
              <span>Table</span>
              {!isEditingTableName && (
                <Edit2 className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </span>
            {isEditingTableName ? (
              <div className="mt-0.5 flex items-center gap-1">
                <input
                  ref={tableNameInputRef}
                  type="text"
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  onBlur={handleSaveTableName}
                  onKeyDown={handleTableNameKeyDown}
                  className="w-full border-b border-foreground/40 bg-transparent p-0 font-mono text-[12px] font-medium leading-tight text-foreground outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveTableName}
                  className="rounded p-0.5 text-signal hover:opacity-80"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingTableName(true)}
                className="mt-0.5 cursor-text font-mono text-[12px] font-medium leading-tight text-foreground hover:underline underline-offset-2"
                title="Click to rename table"
              >
                {table.name}
              </span>
            )}
          </div>

          {/* Schema */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 min-w-[110px] cursor-pointer items-center justify-between gap-2.5 rounded-md border border-border bg-card px-2.5 py-1 text-left transition-colors hover:bg-muted"
              >
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] leading-none text-muted-foreground">
                    Schema
                  </span>
                  <span className="mt-0.5 font-mono text-[12px] font-medium leading-tight text-foreground">
                    {table.schema || "public"}
                  </span>
                </div>
                <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 font-mono">
              <DropdownMenuLabel className="text-[11px] font-sans text-muted-foreground">
                Switch schema
              </DropdownMenuLabel>
              {availableSchemas.map((schema) => {
                const isCurrent = (table.schema || "public") === schema;
                return (
                  <DropdownMenuItem
                    key={schema}
                    onClick={() => {
                      onSelectSchema?.(schema);
                      onUpdateTableSchema?.(table.name, schema);
                    }}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <span>{schema}</span>
                    {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Row level security */}
          <div className="flex h-9 items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-1">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="font-mono text-[11px] font-medium text-foreground">
                Row level security
              </span>
            </div>
            <Switch
              checked={isRLSEnabled}
              onCheckedChange={handleRLSSwitch}
              size="sm"
              aria-label="Toggle row level security"
            />
          </div>
        </div>

        {/* Reset table button if modified */}
        {onResetTable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onResetTable(table.name);
                  toast.info("Reset to the introspected schema");
                }}
                className="flex items-center gap-1 rounded p-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset table to the database schema</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 2. Columns */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[12px] font-semibold text-foreground">
              Columns
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {formattedColumns.length}
            </span>
          </div>

          {!isAddingColumn && (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              <span>Add column</span>
            </button>
          )}
        </div>

        {/* Column definitions with inline editing */}
        <div className="space-y-px font-mono text-[13px]">
          {formattedColumns.map((col) => {
            const rawCol = table.columns.find((c) => c.name === col.name);
            const isEditing = editingColumnName === col.name;

            return (
              <div
                key={col.name}
                className="group -mx-2 flex items-center justify-between rounded px-2 py-1.5 transition-colors select-all hover:bg-card/80"
              >
                {/* Left: name and type */}
                <div className="flex min-w-0 items-center gap-2.5">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={colNameInputRef}
                        type="text"
                        value={colNameInput}
                        onChange={(e) => setColNameInput(e.target.value)}
                        onBlur={() => handleSaveColumnName(col.name)}
                        onKeyDown={(e) => handleColNameKeyDown(e, col.name)}
                        className="border-b border-foreground/50 bg-card px-1 py-0 font-mono text-[12px] font-medium text-foreground outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveColumnName(col.name)}
                        className="p-0.5 text-signal hover:opacity-80"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => handleStartEditColumn(col.name)}
                      className="shrink-0 cursor-text font-medium text-foreground hover:underline underline-offset-2 decoration-muted-foreground/40"
                      title="Click to rename column"
                    >
                      {col.name}
                    </span>
                  )}

                  {/* Data type */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 cursor-pointer rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                        title="Click to change data type"
                      >
                        {col.formattedType}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 font-mono">
                      <DropdownMenuLabel className="text-[11px] font-sans text-muted-foreground">
                        Select data type
                      </DropdownMenuLabel>
                      {COMMON_DATA_TYPES.map((typeOption) => (
                        <DropdownMenuItem
                          key={typeOption}
                          onClick={() => {
                            const isPk = typeOption.includes("PRIMARY KEY");
                            onUpdateColumn?.(table.name, col.name, {
                              data_type: typeOption.replace(" PRIMARY KEY", ""),
                              is_primary_key: isPk ? true : rawCol?.is_primary_key,
                            });
                            toast.success(`Updated "${col.name}" to ${typeOption}`);
                          }}
                          className="flex cursor-pointer items-center justify-between"
                        >
                          <span>{typeOption}</span>
                          {col.formattedType === typeOption && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {col.isPrimaryKey && (
                    <span className="inline-flex select-none items-center gap-1 rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-300">
                      <Key className="h-2.5 w-2.5" />
                      <span>PK</span>
                    </span>
                  )}

                  {!col.nullable && !col.isPrimaryKey && (
                    <span className="select-none font-mono text-[10px] text-muted-foreground">
                      not null
                    </span>
                  )}
                </div>

                {/* Right: hover actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPk = !rawCol?.is_primary_key;
                          onUpdateColumn?.(table.name, col.name, { is_primary_key: nextPk });
                          toast.info(nextPk ? `Set "${col.name}" as primary key` : `Removed primary key from "${col.name}"`);
                        }}
                        className={cn(
                          "rounded p-1 transition-colors",
                          col.isPrimaryKey
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        aria-label="Toggle primary key"
                      >
                        <Key className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Toggle primary key</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const nextNullable = !rawCol?.nullable;
                          onUpdateColumn?.(table.name, col.name, { nullable: nextNullable });
                          toast.info(nextNullable ? `"${col.name}" is now nullable` : `"${col.name}" is now NOT NULL`);
                        }}
                        className="rounded px-1 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {rawCol?.nullable ? "NULL" : "NN"}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {rawCol?.nullable ? "Make NOT NULL" : "Make nullable"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteColumn?.(table.name, col.name);
                          toast.success(`Deleted column "${col.name}"`);
                        }}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete column"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete column</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline Add Column Form */}
        {isAddingColumn && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/90 p-2.5 font-mono text-xs">
            <Input
              ref={addColInputRef}
              type="text"
              placeholder="column_name"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateColumn();
                if (e.key === "Escape") setIsAddingColumn(false);
              }}
              className="h-8 w-40 border-border bg-background font-mono text-xs"
            />

            {/* Select Data Type */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 min-w-[120px] items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground hover:bg-muted/50"
                >
                  <span>{newColType}</span>
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 font-mono text-xs">
                {COMMON_DATA_TYPES.map((t) => (
                  <DropdownMenuItem
                    key={t}
                    onClick={() => setNewColType(t)}
                    className="cursor-pointer"
                  >
                    <span>{t}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* PK Checkbox */}
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={newColIsPk}
                onChange={(e) => setNewColIsPk(e.target.checked)}
                className="rounded border-border text-primary"
              />
              <span>Primary key</span>
            </label>

            {/* Not Null Checkbox */}
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={newColNotNull}
                onChange={(e) => setNewColNotNull(e.target.checked)}
                className="rounded border-border text-primary"
              />
              <span>Not null</span>
            </label>

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateColumn}
                className="h-8 px-3 text-xs"
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingColumn(false)}
                className="h-8 px-2.5 text-xs text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Constraints Section (Direct Monospace Lines, Fully Editable) */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[12px] font-semibold text-foreground">
              Constraints
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {constraints.length}
            </span>
          </div>

          {!isAddingConstraint && (
            <button
              type="button"
              onClick={() => setIsAddingConstraint(true)}
              className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              <span>Add constraint</span>
            </button>
          )}
        </div>

        {/* Constraints List */}
        {constraints.length === 0 ? (
          <div className="py-1 font-mono text-xs text-muted-foreground/70">
            No constraints recorded for this table.
          </div>
        ) : (
          <div className="space-y-px font-mono text-[13px]">
            {constraints.map((constraint) => {
              const fkCol = table.foreign_keys?.find(
                (fk) => `${table.name}_${fk.column}_fk` === constraint.name
              )?.column;

              return (
                <div
                  key={constraint.id}
                  className="group -mx-2 flex items-center justify-between rounded px-2 py-1.5 transition-colors select-all hover:bg-card/80"
                >
                  <div className="flex flex-wrap items-center leading-6 gap-x-1">
                    {constraint.tokens.map((token, idx) => (
                      <span
                        key={idx}
                        className={
                          token.isKeyword
                            ? "font-semibold text-foreground/90 font-mono tracking-tight"
                            : "font-mono text-muted-foreground"
                        }
                      >
                        {token.text}
                      </span>
                    ))}
                  </div>

                  {/* Delete constraint action if it's a foreign key */}
                  {fkCol && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteConstraint?.(table.name, fkCol);
                            toast.success(`Removed constraint "${constraint.name}"`);
                          }}
                          className="ml-2 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete constraint"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete constraint</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Add Constraint Form */}
        {isAddingConstraint && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/90 p-2.5 font-mono text-xs">
            <span className="text-[11px] text-muted-foreground">Foreign key</span>
            {/* Local Column Picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 min-w-[90px] items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground"
                >
                  <span>{constraintCol || "column"}</span>
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 font-mono text-xs">
                {table.columns.map((c) => (
                  <DropdownMenuItem
                    key={c.name}
                    onClick={() => setConstraintCol(c.name)}
                    className="cursor-pointer"
                  >
                    <span>{c.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-[11px] text-muted-foreground">references</span>

            {/* Target Table Picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 min-w-[100px] items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground"
                >
                  <span>{targetTableName || "target table"}</span>
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 font-mono text-xs">
                {otherTables.map((t) => (
                  <DropdownMenuItem
                    key={t.name}
                    onClick={() => {
                      setTargetTableName(t.name);
                      setTargetColName(t.columns[0]?.name || "id");
                    }}
                    className="cursor-pointer"
                  >
                    <span>{t.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Target Column Input */}
            <span className="text-[11px] text-muted-foreground">(</span>
            <input
              type="text"
              value={targetColName}
              onChange={(e) => setTargetColName(e.target.value)}
              placeholder="id"
              className="h-8 w-16 rounded-md border border-border bg-background px-1.5 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground">)</span>

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateConstraint}
                className="h-8 px-3 text-xs"
              >
                Add constraint
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingConstraint(false)}
                className="h-8 px-2.5 text-xs text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
