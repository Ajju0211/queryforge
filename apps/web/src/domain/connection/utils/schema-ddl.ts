/**
 * Pure domain utilities for formatting SQL statements, DDL extraction,
 * and column/constraint tokenization according to PostgreSQL standards.
 * Single Source of Truth for schema representation.
 */

import {
  ColumnMetadata,
  TableMetadata,
} from "../models/connection.types";

export interface SqlToken {
  text: string;
  isKeyword: boolean;
}

export interface ConstraintDefinition {
  id: string;
  name: string;
  type: "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK";
  tokens: SqlToken[];
  rawSql: string;
}

export interface FormattedColumn {
  name: string;
  formattedType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  nullable: boolean;
}

/**
 * Clean canonical PostgreSQL types to clean standard SQL types for QueryForge studio.
 */
export function cleanSqlType(dataType: string): string {
  let t = dataType.trim().toUpperCase();
  // Normalize character varying -> VARCHAR
  t = t.replace(/^CHARACTER VARYING/i, "VARCHAR");
  t = t.replace(/^VARCHAR2/i, "VARCHAR");
  // Normalize timestamp with time zone -> TIMESTAMPTZ
  t = t.replace(/^TIMESTAMP WITH TIME ZONE/i, "TIMESTAMPTZ");
  t = t.replace(/^TIMESTAMP WITHOUT TIME ZONE/i, "TIMESTAMP");
  // Normalize int types
  if (t === "INT4") t = "INTEGER";
  if (t === "INT8") t = "BIGINT";
  if (t === "INT2") t = "SMALLINT";
  if (t === "BOOL") t = "BOOLEAN";
  return t;
}

/**
 * Format PostgreSQL data type and primary key keyword for QueryForge studio.
 */
export function formatColumnType(col: ColumnMetadata): string {
  const cleanType = cleanSqlType(col.data_type);

  if (col.is_primary_key) {
    if (
      cleanType === "INTEGER" ||
      cleanType === "INT4" ||
      cleanType === "INT" ||
      cleanType === "SERIAL"
    ) {
      return "SERIAL PRIMARY KEY";
    }
    if (cleanType === "BIGINT" || cleanType === "INT8" || cleanType === "BIGSERIAL") {
      return "BIGSERIAL PRIMARY KEY";
    }
    return `${cleanType} PRIMARY KEY`;
  }

  return cleanType;
}

/**
 * Transforms column metadata into presentation-ready column items.
 */
export function formatColumns(columns: ColumnMetadata[]): FormattedColumn[] {
  return columns.map((col) => ({
    name: col.name,
    formattedType: formatColumnType(col),
    isPrimaryKey: col.is_primary_key,
    isForeignKey: col.is_foreign_key,
    nullable: col.nullable,
  }));
}

/**
 * Derives constraint definitions with syntax tokens for high-fidelity SQL rendering.
 */
export function deriveTableConstraints(table: TableMetadata): ConstraintDefinition[] {
  const constraints: ConstraintDefinition[] = [];

  // 1. Primary Key constraint
  const pkColumns = table.columns.filter((c) => c.is_primary_key);
  if (pkColumns.length > 0) {
    const pkName = `${table.name}_pkey`;
    const colList = pkColumns.map((c) => c.name).join(", ");
    constraints.push({
      id: `pk_${pkName}`,
      name: pkName,
      type: "PRIMARY KEY",
      tokens: [
        { text: "CONSTRAINT", isKeyword: true },
        { text: ` ${pkName} `, isKeyword: false },
        { text: "PRIMARY KEY", isKeyword: true },
        { text: ` (${colList})`, isKeyword: false },
      ],
      rawSql: `CONSTRAINT ${pkName} PRIMARY KEY (${colList})`,
    });
  }

  // 2. Foreign Key constraints
  if (table.foreign_keys && table.foreign_keys.length > 0) {
    table.foreign_keys.forEach((fk, idx) => {
      const fkName = `${table.name}_${fk.column}_fk`;
      const targetSchema = table.schema || "public";
      const targetTable = fk.target_table;
      const targetCol = fk.target_column;

      constraints.push({
        id: `fk_${fkName}_${idx}`,
        name: fkName,
        type: "FOREIGN KEY",
        tokens: [
          { text: "CONSTRAINT", isKeyword: true },
          { text: ` ${fkName} `, isKeyword: false },
          { text: "FOREIGN KEY", isKeyword: true },
          { text: ` (${fk.column}) `, isKeyword: false },
          { text: "REFERENCES", isKeyword: true },
          { text: ` ${targetSchema}.${targetTable} (${targetCol})`, isKeyword: false },
        ],
        rawSql: `CONSTRAINT ${fkName} FOREIGN KEY (${fk.column}) REFERENCES ${targetSchema}.${targetTable} (${targetCol})`,
      });
    });
  }

  return constraints;
}

/**
 * Generates formatted PostgreSQL CREATE TABLE DDL statement for a table.
 */
export function generateTableDDL(table: TableMetadata): string {
  const schemaPrefix = table.schema ? `"${table.schema}".` : "";
  const lines: string[] = [];

  // Column definitions
  table.columns.forEach((col) => {
    let colLine = `  "${col.name}" ${col.data_type.toUpperCase()}`;
    if (col.is_primary_key) {
      colLine += " PRIMARY KEY";
    } else if (!col.nullable) {
      colLine += " NOT NULL";
    }
    lines.push(colLine);
  });

  // Foreign keys
  if (table.foreign_keys) {
    table.foreign_keys.forEach((fk) => {
      const fkName = `${table.name}_${fk.column}_fk`;
      const targetSchema = table.schema ? `"${table.schema}".` : "";
      lines.push(
        `  CONSTRAINT "${fkName}" FOREIGN KEY ("${fk.column}") REFERENCES ${targetSchema}"${fk.target_table}" ("${fk.target_column}")`
      );
    });
  }

  return `CREATE TABLE ${schemaPrefix}"${table.name}" (\n${lines.join(",\n")}\n);`;
}

/**
 * Generates complete DDL for all tables in a schema.
 */
export function generateFullSchemaDDL(tables: TableMetadata[]): string {
  return tables.map((t) => generateTableDDL(t)).join("\n\n");
}
