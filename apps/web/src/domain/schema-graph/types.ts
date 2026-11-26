import { TableMetadata } from "@/domain/connection/models/connection.types";

export type GraphMode = "neighborhood" | "schema" | "full";

export type LayoutDirection = "LR" | "TB";

export interface HiddenRelation {
  relatedTable: string;
  column: string;
  targetColumn: string;
  direction: "outbound" | "inbound";
}

export interface TableNodeData extends Record<string, unknown> {
  table: TableMetadata;
  isFocused: boolean;
  isSelected: boolean;
  isCompact: boolean;
  hiddenRelations: HiddenRelation[];
  onSelectTable: (tableName: string) => void;
  onFocusTable: (tableName: string) => void;
  onExpandRelation: (tableName: string) => void;
}

export interface RelationshipEdgeData extends Record<string, unknown> {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName?: string;
}

export interface GraphFilterState {
  mode: GraphMode;
  selectedSchema: string;
  focusTable: string | null;
  expandedTables: string[];
  searchQuery: string;
  hideOrphans: boolean;
  layoutDirection: LayoutDirection;
  isCompactView: boolean;
}
