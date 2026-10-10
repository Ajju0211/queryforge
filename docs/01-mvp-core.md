# AskDB - Minimum Viable Product (MVP) Specification

## 1. Document Purpose & Overview

This document specifies the target architecture, security guardrails, technology choices, and acceptance criteria for the **AskDB MVP**. 

The goal of the product is to provide an open-source, developer-first workspace where teams can:
1. Connect a remote PostgreSQL database over a secure TLS connection.
2. Automatically introspect and discover the database schema (tables, columns, types, foreign keys).
3. Ask natural-language questions and receive validated, read-only SQL queries and structured data visualizations.
4. Browse and inspect records through an auto-generated, schema-driven admin interface without hand-coding frontend pages.

The MVP is engineered as a secure, practical, self-hostable modular monolith, designed with clean abstractions so that a multi-tenant hosted SaaS and future connection modes can be layered on without structural rewrites.

---

## 2. Confirmed MVP Decisions

The following architectural and technical choices are confirmed defaults for the MVP:

| Component | Choice | Rationale & Configuration Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14+ (App Router), TypeScript** | Server components, modern routing, strong typing, easy deployment. |
| **Frontend Styling & UI** | **Tailwind CSS + shadcn/ui** | Accessible, copy-paste headless UI primitives based on Radix UI; no runtime UI styling lock-in. |
| **Data Tables & Visuals** | **TanStack Table v8, Recharts** | High-performance headless tables for large result sets; composable chart primitives. |
| **Backend Framework** | **FastAPI, Python 3.12+** | Async I/O, native Pydantic v2 validation, OpenAPI documentation generation, high throughput. |
| **Application Database** | **PostgreSQL 16 (Isolated)** | Dedicated internal database for users, workspaces, connection credentials, chat history, and audit logs. Completely isolated from customer databases. |
| **Customer DB Support** | **PostgreSQL only** | Focus on deep, native PostgreSQL support (types, JSONB, foreign keys, system catalogs) for MVP before adding other database engines. |
| **Database Access Layer** | **SQLAlchemy 2.0 (Async) + asyncpg** | High-performance async driver with connection-level `server_settings` enforcement and robust connection pooling. |
| **Migrations** | **Alembic** | Programmatic, version-controlled schema migrations for the internal application database. |
| **SQL Parsing & Validation** | **sqlglot (PostgreSQL dialect)** | AST-level validation ensuring strict single-statement, read-only `SELECT` queries, blocking data-modifying CTEs and unsafe functions. |
| **Credential Encryption** | **cryptography (Fernet / AES-128-CBC + HMAC-SHA256)** | Encryption of customer database connection credentials at rest, with `MultiFernet` key rotation support. |
| **AI Provider & Model** | **Google Gemini 2.0 Flash (`google-genai` SDK)** | Low latency, highly cost-conscious (~$0.10 / 1M input tokens), generous rate limits, and native structured output via `response_schema` (Pydantic). |
| **Connection Method** | **Direct PostgreSQL connection over TLS** | Direct outbound connection from backend to customer PostgreSQL instance with `sslmode=require`. |
| **Query Behavior** | **Strictly Read-Only** | Enforced at four distinct layers: user role guidance, connection settings, transaction flags, and AST validation. |
| **Admin Panel Generation**| **Schema-driven reusable React components** | Deterministic, client-rendered tables and relation viewers derived from backend schema metadata. **Zero arbitrary AI-generated code execution**. |
| **Testing Framework** | **pytest, pytest-asyncio, Testcontainers** | Real PostgreSQL containers spun up via `testcontainers[postgres]` for integration tests. |
| **Architecture Layout** | **Modular Monolith in Monorepo** | Single Git repository containing `apps/web`, `apps/api`, `infra`, and `docs`. |

---

## 3. Explicitly Out of Scope for MVP

The following capabilities are deferred to post-MVP releases:
1. **Confirmed Natural-Language Write Actions:** `INSERT`, `UPDATE`, `DELETE`, and `DDL` statements (see [02-feature-write-actions.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/02-feature-write-actions.md)).
2. **Local Database Connector:** Outbound-only agent for private networks/Docker stacks behind firewalls (see [03-feature-local-connector.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/03-feature-local-connector.md)).
3. **Non-PostgreSQL Engines:** MySQL, SQLite, Snowflake, ClickHouse, SQL Server (see [04-feature-future-roadmap.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/04-feature-future-roadmap.md)).
4. **Enterprise SSO & Hierarchical RBAC:** Okta, SAML 2.0, SCIM, and granular table/column-level permissions (see [04-feature-future-roadmap.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/04-feature-future-roadmap.md)).
5. **Scheduled Autonomous AI Reports:** Background cron jobs sending summaries to Slack or email (see [04-feature-future-roadmap.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/04-feature-future-roadmap.md)).

---

## 4. Technical Correctness & Security Audit

Executing AI-generated SQL against customer databases requires defense-in-depth. Relying on a single check (e.g. `isinstance(expr, sqlglot.exp.Select)`) is fundamentally unsafe. The MVP enforces defense-in-depth across eight security vectors:

### 4.1 SQL Validation Engine (`sqlglot`)
The backend validator treats all LLM output as untrusted user input. Before any query reaches the customer database, it must pass the following AST validation pipeline:

1. **Strict Single-Statement Enforcement:**
   `parsed = sqlglot.parse(raw_sql, read="postgres")`
   If `len(parsed) != 1`, immediately reject the query. Semicolon-delimited multi-statement injection (e.g. `SELECT 1; DROP TABLE users;`) is blocked.
2. **Root Statement Type Verification:**
   The root node must be `isinstance(parsed[0], sqlglot.exp.Select)`. Commands, DDL, and DML roots (`Insert`, `Update`, `Delete`, `Create`, `Drop`, `Alter`, `Command`) are rejected.
3. **Data-Modifying CTE Detection:**
   PostgreSQL permits data manipulation within Common Table Expressions (e.g. `WITH deleted AS (DELETE FROM orders RETURNING *) SELECT * FROM deleted;`). 
   The validator traverses all CTEs (`parsed[0].find_all(sqlglot.exp.CTE)`) and verifies that no CTE child expression contains `sqlglot.exp.Insert`, `sqlglot.exp.Update`, `sqlglot.exp.Delete`, or `sqlglot.exp.Merge`.
4. **Disallowed AST Node Blocklist:**
   A recursive AST walk (`parsed[0].walk()`) asserts that none of the following nodes exist anywhere in the syntax tree:
   - `sqlglot.exp.Into` (prevents `SELECT ... INTO new_table`)
   - `sqlglot.exp.Create`, `sqlglot.exp.Drop`, `sqlglot.exp.Alter`
   - `sqlglot.exp.Insert`, `sqlglot.exp.Update`, `sqlglot.exp.Delete`, `sqlglot.exp.Merge`
   - `sqlglot.exp.Transaction`, `sqlglot.exp.Commit`, `sqlglot.exp.Rollback`
   - `sqlglot.exp.Command` (prevents raw utility commands like `COPY`, `VACUUM`, `EXPLAIN ANALYZE`)
5. **Disallowed Function Call Blocklist:**
   Inspect all function calls (`parsed[0].find_all(sqlglot.exp.Anonymous, sqlglot.exp.Func)`). Reject any queries invoking PostgreSQL functions with side effects or system risks:
   - Denial of Service: `pg_sleep`, `pg_sleep_for`, `pg_sleep_until`
   - File System Access: `pg_read_file`, `pg_write_file`, `lo_import`, `lo_export`
   - Administrative / Process: `pg_terminate_backend`, `pg_cancel_backend`, `pg_reload_conf`, `pg_rotate_logfile`
   - External Connections: `dblink_connect`, `dblink_exec`
6. **Bounded Result Enforcement (Limit Clamping):**
   - If the AST lacks a `LIMIT` clause, inject `LIMIT 500`.
   - If the existing `LIMIT` exceeds 500, rewrite it to 500.
   - The database execution driver additionally caps result retrieval using `cursor.fetchmany(501)` to guard against rewritten queries or subquery unbounding.

### 4.2 Database Enforcement & Isolation
Relying solely on client-side transaction options (`postgresql_readonly=True`) is insufficient because transaction state can be altered if permissions permit. The system enforces read-only execution at multiple layers:

1. **Dedicated Read-Only Role Guidance:**
   Documentation and onboarding explicitly instruct users to provision a dedicated read-only database user:
   ```sql
   CREATE USER ai_workspace_readonly WITH PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE customer_db TO ai_workspace_readonly;
   GRANT USAGE ON SCHEMA public TO ai_workspace_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_workspace_readonly;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_workspace_readonly;
   ALTER ROLE ai_workspace_readonly SET default_transaction_read_only = on;
   ```
2. **Engine Connection Settings (`connect_args`):**
   When creating the customer database engine via SQLAlchemy and `asyncpg`, configuration parameters are set directly in `connect_args.server_settings`:
   ```python
   engine = create_async_engine(
       connection_url,
       connect_args={
           "server_settings": {
               "default_transaction_read_only": "on",
               "statement_timeout": "15000",          # 15 second query timeout
               "lock_timeout": "5000",                # 5 second lock timeout
               "idle_in_transaction_session_timeout": "10000"
           }
       },
       pool_size=5,
       max_overflow=10,
       pool_timeout=10,
       pool_pre_ping=True,
   )
   ```
3. **Transaction-Level Guard:**
   Every query executes within an explicit read-only transaction block:
   ```python
   async with engine.connect() as conn:
       await conn.execution_options(
           isolation_level="SERIALIZABLE",
           postgresql_readonly=True
       )
       async with conn.begin():
           result = await conn.execute(text(validated_sql))
           rows = result.fetchmany(501)
   ```

### 4.3 Credential Protection & Secret Management
1. **Encryption at Rest:** Customer database connection parameters (host, port, username, password, database) are serialized and encrypted using Fernet (AES-128-CBC + HMAC-SHA256) prior to insertion into the internal PostgreSQL `database_connections` table.
2. **Key Storage:** The master key (`ENCRYPTION_MASTER_KEY`) is injected via environment variables. In production, this is sourced from a secret manager (AWS Secrets Manager, GCP Secret Manager, or Vault).
3. **Key Rotation Plan:** Key rotation is supported out of the box using `cryptography.fernet.MultiFernet`. The primary key encrypts new connections; existing connections can be decrypted using secondary keys in the keyring and lazily re-encrypted with the primary key.
4. **Secret Redaction & Memory Safety:**
   - Password fields in Pydantic models use `pydantic.SecretStr` to prevent accidental logging or printing in tracebacks.
   - Logging interceptors apply regex masking to sanitize connection strings (`postgresql://...`) in standard log output.
   - API endpoints (`GET /api/v1/connections`) serialize to `ConnectionRead` schemas that completely omit passwords and mask hostnames (e.g. `db.***.com`).
   - Credentials are **strictly forbidden** from entering LLM prompts, token caches, or audit log tables.

### 4.4 Connection Security & SSRF Prevention
Allowing users to specify arbitrary database hosts creates severe Server-Side Request Forgery (SSRF) risks, potentially exposing internal VPC services, Kubernetes internal DNS, or cloud metadata endpoints (`169.254.169.254`).

1. **DNS Resolution & IP Validation:**
   Before establishing any socket connection, the backend resolves the target host via DNS and validates all returned IP addresses against a private network blocklist:
   - Loopback: `127.0.0.0/8`, `::1`
   - Link-Local & Cloud Metadata: `169.254.0.0/16`, `fe80::/10` (specifically protects AWS/GCP `169.254.169.254`)
   - Private RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Carrier-Grade NAT: `100.64.0.0/10`
   - Multicast & Reserved: `224.0.0.0/4`, `240.0.0.0/4`
   *Development Mode Exception:* An environment variable `ALLOW_PRIVATE_NETWORKS=true` can be enabled strictly in local development to allow connecting to `localhost` or Docker container networks. In production, this flag defaults to `false`.
2. **Mandatory TLS:**
   All external database connections must use TLS (`sslmode=require`, `sslmode=verify-ca`, or `sslmode=verify-full`). Unencrypted plaintext database connections across the public internet are rejected.
3. **Connection & Socket Timeouts:**
   TCP connection attempts are bounded by a strict 5-second socket timeout (`connect_timeout=5` in `connect_args`).

### 4.5 Schema Discovery & Context Pruning
1. **Schema Scope:** Discovery targets the `public` schema (or user-selected schemas) and ignores internal PostgreSQL schemas (`pg_catalog`, `information_schema`, `pg_toast`, etc.).
2. **Metadata Extracted:** Table names, table row count estimates (from `pg_class.reltuples`), column names, column data types, nullability, primary key constraints, foreign key relationships, and indexes.
3. **Table & Column Exclusions:** Users can explicitly select which tables and columns to include or exclude during connection configuration. Excluded tables are never cached, never exposed to the frontend, and never passed to the LLM.
4. **Context Budgeting & Pruning:** For databases with dozens or hundreds of tables, the system prunes the schema context sent to the LLM based on table relevance to the user's question, preventing token exhaustion and prompt dilution.
5. **Zero Customer Row Data in Prompts:** Schema discovery extracts only structural metadata. Customer row data is never extracted or sent to the LLM during discovery.

### 4.6 Authorization & Workspace Isolation
1. **Multi-Tenant Ownership Model:** Every database connection and chat session is scoped to a `workspace_id`.
2. **Backend Enforcement:** Every FastAPI route verifies that the authenticated user (`current_user`) has active membership in the requested workspace.
3. **IDOR Prevention:** All queries on connections and chats execute with compound filters (`WHERE id = :connection_id AND workspace_id = :current_workspace_id`). Attempting to access a connection from a different workspace returns a `404 Not Found` or `403 Forbidden`.

### 4.7 AI-Generated SQL Integrity & Model Selection
1. **Model Selection:** **Google Gemini 2.0 Flash** via the unified `google-genai` Python SDK.
   - Cost-conscious: ~$0.10 / 1M input tokens, ~$0.40 / 1M output tokens.
   - Native Structured Outputs: Supported via `response_mime_type="application/json"` and `response_schema=PydanticModel`, guaranteeing that responses parse cleanly without markdown stripping hacks.
   - Fallback/Alternative: Gemini 1.5 Flash (compatible drop-in).
2. **Untrusted Model Output:** LLM output is parsed directly into a Pydantic `AIQueryResponse` model, extracted, validated via `sqlglot`, and verified against the known schema table whitelist before execution.

### 4.8 Data Privacy & Retention Policy
1. **Customer Query Results:** Query result rows are **ephemeral**. They are streamed/returned directly to the browser client and are **never persisted** in the application database.
2. **Audit Logs:** The internal DB records audit events: user ID, workspace ID, connection ID, prompt text, generated SQL, execution duration, row count returned, and timestamp. Audit logs allow workspaces to monitor AI query activity.
3. **AI Provider Privacy:** Requests use commercial Google AI Studio / Vertex AI API endpoints under enterprise terms where customer prompts and schemas are not retained for model training (Zero Data Retention).

---

## 5. Testing Strategy & Test Matrix

Backend testing uses `pytest` and `pytest-asyncio`. To avoid brittle mocks, integration tests use `testcontainers[postgres]` to spin up real, isolated PostgreSQL containers.

### Test Matrix

| Category | Test Case | Expected Behavior |
| :--- | :--- | :--- |
| **Authentication & AuthZ** | User accesses connection from another workspace | Returns `404 Not Found` or `403 Forbidden` (IDOR prevented). |
| **Connection Security** | Host resolves to `169.254.169.254` or `127.0.0.1` | Blocked immediately with `SSRFSecurityError` before socket creation. |
| **Connection Security** | Target DB is unreachable or hangs on connect | Times out after 5 seconds with a user-friendly connection error. |
| **Credential Safety** | Invalid database password | Error caught cleanly; connection string redacted from logs and response. |
| **Schema Discovery** | Introspect table with foreign keys and compound PK | Correctly maps relations, types, and primary keys into schema JSON. |
| **Schema Discovery** | Table excluded by user configuration | Excluded table omitted from metadata and forbidden from query context. |
| **SQL Validation** | Generated SQL contains `DROP TABLE` or `UPDATE` | Blocked by `sqlglot` validator with `UnsafeQueryError`. |
| **SQL Validation** | Multi-statement injection (`SELECT 1; DROP TABLE x;`) | Blocked by single-statement validator. |
| **SQL Validation** | Data-modifying CTE (`WITH d AS (DELETE ...) SELECT *`) | Blocked by CTE AST inspection. |
| **SQL Validation** | `SELECT ... INTO new_table` | Blocked by disallowed AST node inspection. |
| **SQL Validation** | `SELECT pg_sleep(20)` | Blocked by disallowed function blocklist. |
| **SQL Validation** | Query lacks `LIMIT` clause | Rewritten with `LIMIT 500` before execution. |
| **Database Execution** | Slow query exceeding statement timeout | Aborted by PostgreSQL after 15 seconds; returns clean `QueryTimeoutError`. |
| **Database Execution** | Read-only enforcement bypass attempt | Rejected at PostgreSQL transaction level (`READ ONLY transaction`). |
| **Database Execution** | Query returns 0 rows | Returns empty array with column definitions without crashing frontend. |

---

## 6. Acceptance Criteria

The MVP is complete when the following acceptance criteria pass end-to-end:

1. **Workspace & Connection Setup:**
   - A user can register, log in, and access their default workspace.
   - A user can input PostgreSQL connection details (host, port, database, user, password, TLS toggle).
   - The backend validates the host against SSRF rules, verifies TLS, encrypts credentials with Fernet, and tests the connection.
2. **Schema Introspection:**
   - The system introspects the connected database, extracts all tables, columns, primary keys, and foreign keys in the `public` schema, and persists the metadata to the internal application DB.
   - The user can view the discovered schema in the web UI and toggle table inclusion/exclusion.
3. **Natural-Language Query & Safe Execution:**
   - A user can submit a natural-language question (e.g. *"Show the top 5 customers by total spending"*).
   - The backend queries Gemini 2.0 Flash with pruned schema context and receives a structured response containing thought process, SQL query, and visualization configuration.
   - The `sqlglot` validator verifies the query is a single read-only `SELECT`, clamps the `LIMIT` to 500, and ensures no prohibited functions or CTEs exist.
   - The query executes against the customer DB in a read-only transaction with a 15-second timeout.
   - Results are rendered in the browser as an interactive TanStack table or Recharts visualization according to the model's recommendation.
4. **Generated Admin Interface:**
   - The web UI dynamically generates table views (`/admin/[connectionId]/[tableName]`) using the stored schema metadata.
   - Users can sort columns, filter text, paginate, and click foreign key relation chips to inspect referenced records.
5. **Security Enforcement:**
   - Malicious prompts attempting data modification (`UPDATE`, `DELETE`, `DROP`, `ALTER`, `SELECT INTO`, `pg_sleep`) are blocked with clear explanations.
   - SSRF attempts to private networks or metadata endpoints in production mode are blocked.
   - Customer query results are never written to the application database.

---

## 7. Vertical Slice 1 Definition

Before expanding the feature set, the team must complete and verify the single end-to-end **Vertical Slice 1**:

```
[Local Dev Environment]
   ├── Start internal PostgreSQL and test customer PostgreSQL via docker compose
   ├── Start FastAPI backend (apps/api)
   └── Start Next.js frontend (apps/web)
          │
          ▼
[Step 1: Connect] ── User submits test PostgreSQL connection URI via Web UI
          │
          ▼
[Step 2: Introspect] ── Backend extracts tables & columns, stores in internal DB
          │
          ▼
[Step 3: Query] ── User enters natural language question: "Show 5 recent orders"
          │
          ▼
[Step 4: AI & Validate] ── Gemini 2.0 Flash generates SQL -> sqlglot validates AST
          │
          ▼
[Step 5: Execute & Render] ── Query executes read-only -> TanStack table renders results
```

---

## 8. Status & Confirmed Decisions vs. Open Questions

### Confirmed Decisions
- [x] Monorepo structure (`apps/web`, `apps/api`, `infra`, `docs`).
- [x] Next.js 14+ with TypeScript, Tailwind CSS, and shadcn/ui.
- [x] FastAPI with Python 3.12+, SQLAlchemy 2.0 async, and `asyncpg`.
- [x] Google Gemini 2.0 Flash with official `google-genai` SDK and native Pydantic structured output.
- [x] `sqlglot` multi-pass AST validator for SQL safety.
- [x] Dedicated internal PostgreSQL database for app state, isolated from customer databases.
- [x] Fernet credential encryption at rest with `MultiFernet` rotation support.
- [x] Four-layer read-only query enforcement (role guidance, `connect_args.server_settings`, transaction isolation, AST checks).

### Open Decisions (To be resolved during or after Vertical Slice 1)
1. **Schema Caching & Invalidation:** Should schema discovery run automatically on a polling schedule or strictly on-demand when the user clicks "Refresh Schema"? *(Default for MVP: On-demand manual refresh).*
2. **Chart Library Customization:** Recharts is the default for standard charts (bar, line, pie). Should we support Tremor raw chart components or stick to custom shadcn/ui Recharts wrappers? *(Default for MVP: shadcn/ui Recharts wrappers).*
3. **Audit Log Retention Window:** What is the default retention period for chat history and audit logs before automatic pruning? *(Default for MVP: 30 days configurable via environment variable).*

---

## 9. Related Documentation
- [02-feature-write-actions.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/02-feature-write-actions.md) - Confirmed write actions (Phase 2).
- [03-feature-local-connector.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/03-feature-local-connector.md) - Outbound local database connector (Phase 2/3).
- [04-feature-future-roadmap.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/04-feature-future-roadmap.md) - Multi-database, scheduled reports, and enterprise features.
- [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md) - Deep architectural specs, API contracts, and data flows.
- [06-task-backlog.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md) - Dependency-ordered task breakdown with acceptance criteria.
- [07-progress.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/07-progress.md) - Current implementation status, blockers, and next steps.
