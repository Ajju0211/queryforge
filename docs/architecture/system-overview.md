# System Architecture Overview

## 1. Objective & Scope

This document provides a high-level architectural overview of **QueryForge AI**. Designed as a developer-first, self-hosted open-source modular application, QueryForge AI allows developers to connect their PostgreSQL databases, perform natural-language queries with validated SQL execution, view dynamic visualizations, and explore an auto-generated admin panel without writing frontend code.

To prioritize developer simplicity and ease of local setup, the core architecture is **single-user / self-hosted by default**. Developers download or clone the repository, run the application, connect their databases directly, and work without the overhead of multi-tenant workspaces, user accounts, or complex permission trees.

---

## 2. High-Level Component Topology

QueryForge AI is structured into three clean, focused tiers:

1. **Frontend Web Application (`apps/web`):** Next.js App Router (React, TypeScript, Tailwind CSS, TanStack Table, Recharts) providing the database connection manager, natural-language chat console, data visualization, and schema-driven admin interface.
2. **Backend API (`apps/api`):** FastAPI (Python 3.12+, Pydantic v2) providing connection testing, credential encryption, SSRF protection, database schema introspection, LLM prompt assembly, `sqlglot` AST safety validation, and bounded query execution.
3. **Data Plane:**
   - **Internal Application Database:** Dedicated PostgreSQL instance (or local embedded store) that persists database connection profiles, cached schema metadata, and query history/audit logs. *Target database data rows are never stored here.*
   - **Target Database(s):** The developer's local or remote PostgreSQL database(s), accessed over direct network/TLS using read-only credentials with strict execution timeouts.

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (Browser)"]
        User["Developer / User"]
        Web["Next.js Web App (apps/web)<br/>- Database Connection Manager<br/>- Natural-Language Chat Interface<br/>- TanStack Data Grid & Recharts<br/>- Schema-Driven Admin Panel"]
    end

    subgraph ServiceTier["Service Tier (FastAPI Backend)"]
        API["FastAPI REST API (apps/api)"]
        SSRFGuard["SSRF & Network Guard"]
        CryptoVault["Fernet Credential Vault"]
        SchemaService["Schema Discovery Engine"]
        AIPipeline["LLM Prompt & JSON Pipeline"]
        ASTValidator["sqlglot AST Safety Validator"]
        Executor["Read-Only Query Executor"]
    end

    subgraph ExternalServices["External Intelligence"]
        AIModel["User-Configured AI Model API<br/>(Google Gemini / OpenAI / BYOK)<br/>(Structured Output JSON)"]
    end

    subgraph DataTier["Data Tier"]
        InternalDB[("Internal Application DB<br/>PostgreSQL 16<br/>(Connections, Encrypted Keys, Schema Cache, Query History)")]
        TargetDB[("Target PostgreSQL DB<br/>(Read-Only Session, 15s Timeout)")]
    end

    User -->|HTTP / Localhost| Web
    Web -->|REST API Calls| API

    API --> SSRFGuard
    SSRFGuard --> CryptoVault
    
    API --> SchemaService
    SchemaService -->|Cached Schema| InternalDB
    SchemaService -->|Introspect Catalogs| TargetDB

    API --> AIPipeline
    InternalDB -.->|Decrypted AI Key| AIPipeline
    AIPipeline -->|Schema + Question| AIModel
    AIModel -->|SQL + Chart Config| AIPipeline

    AIPipeline --> ASTValidator
    ASTValidator -->|Validated AST| Executor

    Executor -->|AsyncPG TLS / Read-Only| TargetDB
    Executor -->|Log Query Execution| InternalDB
```

---

## 3. Main Components & Responsibilities

| Component | Technology | Core Responsibilities |
| :--- | :--- | :--- |
| **Frontend Web App** | Next.js 16, React 19, Tailwind CSS | - Connection manager UI to configure database host, port, credentials, and SSL.<br>- AI Settings UI to configure user's AI model API key (BYOK) and preferred model.<br>- Natural-language chat interface with thought reasoning and SQL inspection.<br>- Deterministically renders data grids (TanStack Table) and interactive charts (Recharts).<br>- Dynamically renders schema-driven admin pages (`/admin/[connId]/[table]`). |
| **Backend REST API** | FastAPI, Python 3.12+, Pydantic v2 | - Validates target hostnames and guards against SSRF.<br>- Encrypts database credentials and user AI model API keys at rest using symmetric Fernet encryption.<br>- Introspects target database schemas via PostgreSQL system catalogs.<br>- Interfaces dynamically with user-configured AI model APIs (e.g. Gemini, OpenAI) using Pydantic structured output.<br>- Enforces multi-pass SQL AST safety validation using `sqlglot`.<br>- Executes queries within read-only transactions with 15-second statement timeouts.<br>- Records query execution history in the application database. |
| **Internal Application DB** | PostgreSQL 16 | - Stores encrypted database connection configurations.<br>- Stores encrypted user AI model API keys and preferred provider configuration.<br>- Caches discovered table/column metadata and table inclusion/exclusion settings.<br>- Stores prompt history, generated queries, and execution metrics.<br>- **Guaranteed:** Never stores target database table records. |
| **Target Database(s)** | PostgreSQL (v12+) | - Local or remote databases being inspected and queried.<br>- Queried strictly using read-only transaction semantics. |
| **AI Intelligence Provider (BYOK)** | User-Provided AI Model (Gemini / OpenAI) | - Generates accurate PostgreSQL `SELECT` queries from schema context and user prompts using the user's configured API key.<br>- Suggests suitable visualization layouts (table, bar chart, line chart, pie chart, metric card). |

---

## 4. Primary End-to-End Data Flow

The sequence below illustrates the complete lifecycle of a natural language query in a developer workflow:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer Browser
    participant Web as Next.js Web App
    participant API as FastAPI Backend
    participant InternalDB as Internal App DB
    participant AI as User AI Model API (BYOK)
    participant TargetDB as Target Postgres DB

    Dev->>Web: Submits prompt ("Top 5 customers by revenue")
    Web->>API: POST /api/v1/chat/query { connection_id, prompt }
    API->>InternalDB: Fetch cached schema metadata, connection config & encrypted AI key
    InternalDB-->>API: Returns schema, encrypted DB creds, encrypted AI key
    API->>API: Decrypt DB credentials and AI key via Fernet
    API->>AI: generate_content(Schema + Question, response_schema=AIQueryResponse)
    AI-->>API: Returns JSON (thought_process, sql_query, visualization)
    
    rect rgb(240, 248, 255)
        Note over API: Multi-Pass AST Safety Validation
        API->>API: sqlglot verifies: 1 statement, Root is SELECT
        API->>API: Block CTE mutations, DDL, DML, unsafe functions
        API->>API: Enforce LIMIT 500
    end

    API->>TargetDB: Acquire connection (default_transaction_read_only=on, statement_timeout=15s)
    API->>TargetDB: Execute validated SELECT query
    TargetDB-->>API: Returns rows (fetch up to 501 rows)
    API->>InternalDB: Record query execution log (prompt, SQL, timing, row count)
    API-->>Web: Returns JSON (columns, rows, execution_time, visualization_config)
    Web-->>Dev: Renders interactive TanStack Table / Recharts chart
```

---

## 5. Security & Reliability Considerations

### 5.1 Defense-in-Depth SQL Safety
1. **Application-Level AST Validation:** `sqlglot` parses queries into abstract syntax trees. Statements are rejected if they contain DDL (`DROP`, `ALTER`, `CREATE`), DML (`INSERT`, `UPDATE`, `DELETE`), dangerous Postgres system functions (`pg_sleep`, `lo_export`), or multiple statements.
2. **Database-Level Read-Only Transactions:** Connections execute under `BEGIN TRANSACTION READ ONLY` with `server_settings={"default_transaction_read_only": "on"}`. Even if invalid SQL bypassed the AST parser, PostgreSQL natively rejects modifications.
3. **Strict Statement Timeouts:** Every connection enforces `statement_timeout = 15000` (15 seconds) to prevent runaway full-table scans or lockups on target databases.

### 5.2 Network & Credential Protection
1. **Configurable Network Guard:** In self-hosted development environments, developers can query local databases (e.g., Docker compose services, `localhost`) via `ALLOW_PRIVATE_NETWORKS=true`. When deployed remotely, SSRF guards can block private metadata ranges.
2. **At-Rest Encryption:** Connection strings are encrypted using Fernet (AES-128-CBC + HMAC-SHA256). Passwords are never serialized into API responses or logged.
3. **Data Plane Segregation:** Target database rows are streamed directly to the user's browser session and never persisted to the internal application database.

---

## 6. Assumptions, Unresolved Decisions & Research Areas

### 6.1 Assumptions
- **Developer Local-First:** Designed to be run locally by developers via `docker compose` or direct local dev servers (`npm run dev` and `uvicorn`).
- **PostgreSQL Focus:** MVP targets PostgreSQL instances (local Docker containers or hosted databases over TLS).
- **Read-Only Core:** MVP is strictly read-only; mutations are handled via explicit two-phase confirmation in Phase 2.

### 6.2 Unresolved Decisions
1. **Schema Invalidation:** Should schema discovery refresh automatically on a fixed polling schedule, or remain purely on-demand via a manual "Refresh Schema" button? *(Default: On-demand manual refresh).*
2. **Connection Pooling Strategy:** Should the backend maintain persistent connection pools per target database, or establish ephemeral pooled connections on demand with idle recycling? *(Default: Short-lived cached pools with 5-minute idle reap).*
3. **Internal Storage Option:** Should single-developer mode support a lightweight SQLite internal database alternative alongside PostgreSQL for zero-config setup? *(Researching for Phase 2).*

### 6.3 Areas for Further Research
- **Large Schema Context Optimization:** When a target database has 200+ tables, injecting the entire schema exceeds optimal LLM context windows. Researching lightweight vector embeddings or table-filtering heuristics for schema pruning.
- **Outbound Local Connector:** Evaluating WebSocket vs. gRPC reverse tunnels for the Phase 2 local agent connector to support private firewall traversal without opening inbound ports.
