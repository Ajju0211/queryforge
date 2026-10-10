# Architecture & Data Flow Specification

## 1. System Overview & Component Responsibilities

**AskDB** is architected as a clean modular monolith within a single Git repository. The system strictly separates application management state from customer database operations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Web Frontend (Next.js 14+)                    │
│   - Workspace & Connection UI       - TanStack Table v8 Results Grid   │
│   - AI Chat & Prompt Interface      - Schema-Driven Admin Panel Views  │
│   - Recharts Visualizations         - shadcn/ui Component Primitives   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Server Actions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Backend API (FastAPI)                         │
│   - JWT Auth & Workspace RBAC       - sqlglot Multi-Pass AST Validator │
│   - SSRF & TLS Connection Guard     - Gemini 2.0 Flash GenAI Client    │
│   - Fernet Credential Encryption    - Read-Only Query Executor         │
│   - Schema Introspection Engine     - Audit Logging Service            │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │ SQLAlchemy 2.0 async                   │ asyncpg (TLS)
                ▼                                        ▼
┌──────────────────────────────────┐   ┌─────────────────────────────────┐
│ Application Database (Postgres)  │   │ Connected Customer DB (Postgres)│
│  - Users, Workspaces, Members    │   │  - Customer Data (Untouched)    │
│  - Encrypted Connection Configs  │   │  - Read-Only Transaction State  │
│  - Schema Metadata Cache         │   │  - 15s Statement Timeout Guard  │
│  - Chat Sessions & Audit Logs    │   │  - Dedicated Read-Only User Role│
└──────────────────────────────────┘   └─────────────────────────────────┘
```

### Component Responsibilities

| Component | Technology | Primary Responsibilities |
| :--- | :--- | :--- |
| **Frontend (`apps/web`)** | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui | 1. User login and workspace switching.<br>2. Connection configuration UI with TLS and host input.<br>3. Conversational natural-language chat interface.<br>4. Dynamic schema-driven admin pages (`/admin/[connId]/[table]`).<br>5. Rendering data tables (TanStack Table) and charts (Recharts). |
| **Backend (`apps/api`)** | FastAPI, Python 3.12+, Pydantic v2 | 1. Workspace authentication and authorization middleware.<br>2. SSRF network validation and TLS enforcement.<br>3. Credential encryption/decryption with Fernet.<br>4. Customer schema introspection and cataloging.<br>5. LLM prompt assembly and structured output schema enforcement.<br>6. AST-level SQL validation and safety clamping via `sqlglot`.<br>7. Read-only query execution with bounded streaming.<br>8. Application database audit event recording. |
| **Application DB (`infra/postgres`)** | Dedicated PostgreSQL 16 instance | 1. Persists application users, workspaces, and memberships.<br>2. Stores encrypted customer connection credentials.<br>3. Stores cached schema metadata.<br>4. Stores user prompts, generated SQL queries, and audit logs.<br>*Never stores customer query result rows.* |
| **Customer DB (External)** | Customer-managed PostgreSQL | 1. The external system under exploration.<br>2. Accessed strictly over TLS via dedicated read-only credentials.<br>3. Governed by 15-second statement timeouts and read-only transactions. |

---

## 2. End-to-End Query & Execution Flow

The sequence below illustrates the lifecycle of a natural language question from prompt submission to rendered results:

```
User (Browser)               Backend (FastAPI)               Gemini 2.0 Flash           Customer PostgreSQL
      │                              │                              │                            │
      │ 1. POST /chat/query          │                              │                            │
      │    (prompt, conn_id)         │                              │                            │
      ├─────────────────────────────>│                              │                            │
      │                              │ 2. Validate Auth & Workspace │                            │
      │                              │ 3. Fetch Cached Schema       │                            │
      │                              │ 4. Build Prompt + Schema     │                            │
      │                              │                              │                            │
      │                              │ 5. generate_content()        │                            │
      │                              │    (response_schema=Pydantic)│                            │
      │                              ├─────────────────────────────>│                            │
      │                              │<─────────────────────────────┤                            │
      │                              │ 6. Returns AIQueryResponse   │                            │
      │                              │    (sql_query, visualization)│                            │
      │                              │                              │                            │
      │                              │ 7. sqlglot AST Validation:   │                            │
      │                              │    - Single statement?       │                            │
      │                              │    - Root is SELECT?         │                            │
      │                              │    - No DML/DDL in CTEs?     │                            │
      │                              │    - No unsafe functions?    │                            │
      │                              │    - Clamp LIMIT to 500      │                            │
      │                              │                              │                            │
      │                              │ 8. Acquire Read-Only Conn    │                            │
      │                              │    (SET default_readonly=on, │                            │
      │                              │     statement_timeout=15s)   │                            │
      │                              │ 9. Execute Validated Query   │                            │
      │                              ├──────────────────────────────────────────────────────────>│
      │                              │<──────────────────────────────────────────────────────────┤
      │                              │ 10. Fetch bounded rows (501) │                            │
      │                              │ 11. Write Audit Log Event    │                            │
      │                              │                              │                            │
      │ 12. Return JSON Response     │                              │                            │
      │     (columns, rows, visual)  │                              │                            │
      │<─────────────────────────────┤                              │                            │
      │                              │                              │                            │
      │ 13. Render TanStack Table    │                              │                            │
      │     or Recharts visualization│                              │                            │
```

---

## 3. Schema Metadata Contract (Backend <-> Frontend)

Schema discovery extracts PostgreSQL metadata and serves it over `GET /api/v1/workspaces/{ws_id}/connections/{conn_id}/schema`.

### JSON Payload Schema
```json
{
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "database_name": "production_analytics",
  "introspected_at": "2026-10-10T12:00:00Z",
  "schemas": [
    {
      "name": "public",
      "tables": [
        {
          "name": "customers",
          "estimated_row_count": 14200,
          "is_excluded": false,
          "columns": [
            {
              "name": "id",
              "data_type": "integer",
              "nullable": false,
              "is_primary_key": true,
              "is_foreign_key": false
            },
            {
              "name": "email",
              "data_type": "character varying",
              "nullable": false,
              "is_primary_key": false,
              "is_foreign_key": false
            },
            {
              "name": "created_at",
              "data_type": "timestamp with time zone",
              "nullable": false,
              "is_primary_key": false,
              "is_foreign_key": false
            }
          ],
          "foreign_keys": []
        },
        {
          "name": "orders",
          "estimated_row_count": 52000,
          "is_excluded": false,
          "columns": [
            {
              "name": "id",
              "data_type": "integer",
              "nullable": false,
              "is_primary_key": true,
              "is_foreign_key": false
            },
            {
              "name": "customer_id",
              "data_type": "integer",
              "nullable": false,
              "is_primary_key": false,
              "is_foreign_key": true
            },
            {
              "name": "amount_cents",
              "data_type": "integer",
              "nullable": false,
              "is_primary_key": false,
              "is_foreign_key": false
            }
          ],
          "foreign_keys": [
            {
              "column_name": "customer_id",
              "target_schema": "public",
              "target_table": "customers",
              "target_column": "id"
            }
          ]
        }
      ]
    }
  ]
}
```

### TypeScript Type Definitions (`apps/web/types/schema.ts`)
```typescript
export interface ForeignKeyReference {
  column_name: string;
  target_schema: string;
  target_table: string;
  target_column: string;
}

export interface ColumnMetadata {
  name: string;
  data_type: string;
  nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
}

export interface TableMetadata {
  name: string;
  estimated_row_count: number;
  is_excluded: boolean;
  columns: ColumnMetadata[];
  foreign_keys: ForeignKeyReference[];
}

export interface SchemaNamespace {
  name: string;
  tables: TableMetadata[];
}

export interface DatabaseSchemaResponse {
  connection_id: string;
  database_name: string;
  introspected_at: string;
  schemas: SchemaNamespace[];
}
```

---

## 4. Structured AI Output Contract (Query vs. Visualization)

The backend requests structured JSON directly from **Gemini 2.0 Flash** via the `google-genai` SDK using `response_schema`. This cleanly decouples SQL query generation from visualization configuration:

### Pydantic Models (`apps/api/schemas/ai.py`)
```python
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class VisualizationType(str, Enum):
    TABLE = "table"
    BAR_CHART = "bar_chart"
    LINE_CHART = "line_chart"
    PIE_CHART = "pie_chart"
    METRIC_CARD = "metric_card"

class VisualizationConfig(BaseModel):
    chart_type: VisualizationType = Field(
        description="The recommended UI presentation component"
    )
    title: str = Field(description="Title displayed above chart or table")
    x_axis_column: Optional[str] = Field(
        default=None, description="Column name for X axis or category"
    )
    y_axis_columns: Optional[List[str]] = Field(
        default=None, description="Column names for Y axis metrics"
    )
    metric_label: Optional[str] = Field(
        default=None, description="Label for single metric display"
    )
    description: Optional[str] = Field(
        default=None, description="Brief explanation of findings"
    )

class AIQueryResponse(BaseModel):
    thought_process: str = Field(
        description="Chain-of-thought reasoning explaining SQL generation logic"
    )
    sql_query: str = Field(
        description="The raw PostgreSQL SELECT statement to execute"
    )
    visualization: VisualizationConfig = Field(
        description="Configuration for rendering the query results"
    )
```

---

## 5. Schema-Driven Auto-Generated Admin Interface

The admin interface is **deterministic and schema-driven**. It uses reusable React components styled with shadcn/ui and powered by TanStack Table v8. **No arbitrary AI-generated code is executed on the frontend.**

### Dynamic Route Structure
- `/admin/[connectionId]`: Overview of all discovered tables with row estimates and search filters.
- `/admin/[connectionId]/[tableName]`: Dynamic data grid for the selected table.
- `/admin/[connectionId]/[tableName]/[recordId]`: Record inspector view displaying all fields and linked relations.

### Mechanics of Schema Rendering
1. **Dynamic Column Definitions:**
   The page loads `TableMetadata` from the schema cache. It constructs TanStack Table column definitions dynamically:
   - Primary Keys: Displayed with a badge identifier.
   - Timestamps: Formatted using localized date-time formatters.
   - Booleans: Rendered as green/gray status chips.
   - Text & Numbers: Rendered with monospaced or standard typography with sorting controls.
2. **Interactive Relationship Chips:**
   If `column.is_foreign_key === true`, the cell renders a clickable navigation chip:
   `<Link href="/admin/${connectionId}/${targetTable}/${cellValue}">`
   Clicking the chip navigates immediately to the foreign record.
3. **Filtering & Pagination:**
   The admin interface generates server-paginated queries (`LIMIT 50 OFFSET X`) using `sqlglot`-validated filter clauses based on active UI search inputs.

---

## 6. Authentication, Workspace Ownership & Security Enforcement

```
[Request Header: Authorization: Bearer <JWT>]
                     │
                     ▼
[FastAPI Dependency: get_current_user]
 Validates JWT signature, expiration, and user account status
                     │
                     ▼
[FastAPI Dependency: get_current_workspace(workspace_id)]
 Asserts current_user is an active member of workspace_id
                     │
                     ▼
[Database Query Filter]
 SELECT * FROM database_connections 
 WHERE id = :connection_id AND workspace_id = :workspace_id
 (Guarantees isolation; prevents Insecure Direct Object References)
```

1. **Workspace Scoping:** Every database connection, schema cache record, chat session, and audit event belongs to a `workspace_id`.
2. **Zero Plaintext Credentials in Responses:** Backend API schemas (`ConnectionRead`) sanitize and mask connection information. Passwords are never sent over the wire to the frontend.
3. **Encrypted Storage:** Customer database credentials are encrypted at rest using Fernet before storage in the application database.

---

## 7. Extensibility: Supporting Future Features

The MVP establishes clean interfaces that accommodate future expansions without architectural rewrites:

### 7.1 Pluggable `QueryExecutor` Protocol
The backend query engine defines an abstract protocol:
```python
from typing import Protocol, Any, Dict, List

class QueryResult(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    execution_time_ms: float
    total_rows_returned: int

class QueryExecutor(Protocol):
    async def execute_readonly(
        self, connection_id: str, sql: str
    ) -> QueryResult:
        ...
```
- **MVP Implementation:** `DirectPostgresQueryExecutor` manages direct asyncpg connections over TLS.
- **Future Local Connector:** `TunnelQueryExecutor` routes query packets down the WebSocket tunnel to the customer's local agent without altering prompt generation, AST validation, or frontend rendering.

### 7.2 Two-Phase Write Actions Hook
- The `sqlglot` validator currently has a strict `isinstance(root, sqlglot.exp.Select)` check.
- In Phase 2 (Write Actions), write proposals trigger an impact analysis and issue a signed confirmation token, executing via a `WriteQueryExecutor` transactional method.

---

## 8. Vertical Slice 1 Walkthrough

The first vertical slice proves the entire stack with minimal surface area:

1. **Local Setup:**
   Run `docker compose up -d` in `infra/` to launch:
   - Application DB: `localhost:5432` (`ai_workspace_internal`)
   - Test Customer DB: `localhost:5433` (`customer_demo_db`) pre-seeded with `customers` and `orders` tables.
2. **Connect:**
   User enters connection details in Next.js web UI:
   `postgresql://readonly:password@localhost:5433/customer_demo_db` (with local network override enabled in dev).
3. **Introspect:**
   FastAPI introspects `customer_demo_db`, stores tables and columns in `ai_workspace_internal`, and returns schema JSON.
4. **Prompt:**
   User asks: *"Show the 5 most recent orders with customer IDs and amount"*.
5. **AI & Validation:**
   Gemini 2.0 Flash returns SQL and visualization config. `sqlglot` verifies the query is a single read-only `SELECT` and clamps `LIMIT 500`.
6. **Execution & Table Render:**
   Backend executes query against `customer_demo_db` with `statement_timeout = 15000` and `default_transaction_read_only = on`. Next.js renders the rows in a TanStack Table.

---

## 9. Related Documentation
- [01-mvp-core.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/01-mvp-core.md) - MVP Core Specification.
- [02-feature-write-actions.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/02-feature-write-actions.md) - Confirmed write actions (Phase 2).
- [03-feature-local-connector.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/03-feature-local-connector.md) - Local database connector (Phase 2/3).
- [06-task-backlog.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md) - Task backlog & implementation plan.
- [07-progress.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/07-progress.md) - Progress and next steps.
