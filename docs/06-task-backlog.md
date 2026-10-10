# Dependency-Ordered Task Backlog

## 1. Overview & Execution Principles

This backlog defines the implementation tasks required to build the **AI Database Workspace MVP**. Every task is dependency-ordered to ensure a strict progression from foundational infrastructure to the end-to-end **Vertical Slice 1**, followed by complete MVP capabilities.

### Rules of Engagement
1. **Never skip prerequisites:** Do not start a task until all prerequisite tasks are verified.
2. **Acceptance criteria are mandatory:** A task is only complete when all acceptance criteria are verified with automated tests or manual checks.
3. **Security first:** Security-sensitive tasks (SSRF, AST validation, encryption) require explicit negative/adversarial tests.

---

## 2. Dependency Graph Overview

```
[TASK-01: Monorepo & Infra]
       │
       ├────────────────────────────────────────┐
       ▼                                        ▼
[TASK-02: FastAPI & DB Core]             [TASK-03: Next.js & UI Core]
       │                                        │
       ▼                                        │
[TASK-04: Fernet Encryption]                    │
       │                                        │
       ▼                                        │
[TASK-05: SSRF Guard Engine]                     │
       │                                        │
       ▼                                        │
[TASK-06: Connection Service]                   │
       │                                        │
       ▼                                        │
[TASK-07: Schema Introspection]                 │
       │                                        │
       ▼                                        ▼
[TASK-08: Schema Persistence & API] ───> [TASK-09: Connection & Schema UI]
       │
       ▼
[TASK-10: sqlglot AST Validator]
       │
       ▼
[TASK-11: Gemini 2.0 Flash Client]
       │
       ▼
[TASK-12: Read-Only Query Executor]
       │
       ▼
[TASK-13: Chat UI & Prompt Flow] ──────────────────────────┐
       │                                                   │
       ▼                                                   ▼
[TASK-14: TanStack Grid & Recharts] <─── [VERTICAL SLICE 1 VERIFIED]
       │
       ├────────────────────────────────────────┐
       ▼                                        ▼
[TASK-15: Generated Admin Dynamic Grid]  [TASK-17: Audit Logging]
       │                                        │
       ▼                                        ▼
[TASK-16: Admin Record & Relation View]  [TASK-18: Testcontainers Integration Suite]
```

---

## 3. Milestone 1: Foundation & Local Infrastructure

### TASK-01: Monorepo Foundation & Docker Compose Environment
* **Goal:** Establish monorepo workspace files and local Docker Compose infrastructure for internal application database and demo customer database.
* **Prerequisites:** None.
* **Implementation Details:**
  - Create `infra/docker-compose.yml` with two PostgreSQL services:
    - `app-postgres`: Internal application DB on port 5432 (`ai_workspace_internal`).
    - `customer-demo-postgres`: Seeded demo customer DB on port 5433 (`customer_demo_db`).
  - Create seed script `infra/seed/demo_customer.sql` creating `customers`, `orders`, and `order_items` tables with sample records.
  - Setup root `.env.example` documenting all configuration keys.
* **Acceptance Criteria:**
  - Running `docker compose -f infra/docker-compose.yml up -d` starts both databases without errors.
  - Connecting to port 5433 reveals seeded tables with readable sample data.
* **Verification Steps:**
  - `psql -h localhost -p 5432 -U postgres -d ai_workspace_internal -c "\l"`
  - `psql -h localhost -p 5433 -U postgres -d customer_demo_db -c "SELECT COUNT(*) FROM orders;"`

---

### TASK-02: FastAPI Core Service Setup with Async SQLAlchemy & Alembic
* **Goal:** Initialize `apps/api` with FastAPI, async SQLAlchemy 2.0, Alembic migrations, and health check endpoints.
* **Prerequisites:** TASK-01.
* **Implementation Details:**
  - Set up Python project with `pyproject.toml` or `requirements.txt` (FastAPI, uvicorn, SQLAlchemy>=2.0, asyncpg, alembic, pydantic>=2.0).
  - Configure `app/core/config.py` using `pydantic-settings`.
  - Configure database engine and session factory in `app/db/session.py`.
  - Initialize Alembic (`alembic init -t async migrations`).
  - Create `GET /api/health` returning system status.
* **Acceptance Criteria:**
  - FastAPI server starts via `uvicorn app.main:app`.
  - `GET /api/health` returns `{"status": "ok", "database": "connected"}`.
  - Alembic can run migrations against internal database (`alembic upgrade head`).
* **Verification Steps:**
  - `pytest apps/api/tests/test_health.py` passes.

---

### TASK-03: Next.js Web App Skeleton with Tailwind CSS & shadcn/ui
* **Goal:** Initialize `apps/web` with Next.js 14+ (App Router), TypeScript, Tailwind CSS, and shadcn/ui base components.
* **Prerequisites:** TASK-01.
* **Implementation Details:**
  - Initialize Next.js project inside `apps/web`.
  - Configure Tailwind CSS, fonts, and dark/light color palette.
  - Install shadcn/ui primitives: Button, Card, Dialog, Input, Table, DropdownMenu, Tabs, Toast.
  - Create standard application layout with sidebar navigation (Connections, AI Chat, Admin, Settings).
* **Acceptance Criteria:**
  - Web application starts via `npm run dev` on port 3000.
  - Shell layout renders cleanly with responsive navigation and dark mode toggle.
* **Verification Steps:**
  - `npm run build` succeeds without TypeScript or ESLint errors.

---

## 4. Milestone 2: Security & Connection Management Engine

### TASK-04: Credential Encryption & Key Management (Fernet + MultiFernet)
* **Goal:** Build encryption service for securing customer database credentials at rest.
* **Prerequisites:** TASK-02.
* **Security Critical:** Yes.
* **Implementation Details:**
  - Implement `EncryptionService` in `apps/api/app/core/security/crypto.py` using `cryptography.fernet.MultiFernet`.
  - Support primary key encryption and multi-key fallback decryption for key rotation.
  - Enforce `pydantic.SecretStr` on all credential ingestion models.
  - Build helper to redact credentials from logging streams and URLs.
* **Acceptance Criteria:**
  - String encrypted with key A can be decrypted with key A.
  - When key B is added to `MultiFernet([key_B, key_A])`, ciphertext from key A decrypts successfully.
  - Calling `str()` or `repr()` on credential models masks password fields.
* **Verification Steps:**
  - `pytest apps/api/tests/test_crypto.py` passes with rotation unit tests.

---

### TASK-05: Connection Security & SSRF Protection Engine
* **Goal:** Validate hostnames and block connections to private, link-local, loopback, or cloud metadata endpoints.
* **Prerequisites:** TASK-02.
* **Security Critical:** Yes.
* **Implementation Details:**
  - Implement `NetworkGuard` in `apps/api/app/core/security/network.py`.
  - Resolve DNS hostnames to IP addresses using Python `socket.getaddrinfo`.
  - Validate resolved IPs against ipaddress networks: `127.0.0.0/8`, `169.254.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10`, `fe80::/10`, `::1`.
  - Provide `ALLOW_PRIVATE_NETWORKS` configuration toggle (default `False`, enabled only in local dev).
* **Acceptance Criteria:**
  - Connecting to `169.254.169.254`, `localhost`, or `127.0.0.1` raises `SSRFSecurityError` when `ALLOW_PRIVATE_NETWORKS=False`.
  - Valid public hostnames pass validation.
  - When `ALLOW_PRIVATE_NETWORKS=True`, local docker network IPs are permitted.
* **Verification Steps:**
  - `pytest apps/api/tests/test_network_guard.py` verifies both blocked and allowed IP ranges.

---

### TASK-06: Database Connection Service & TLS Connection Validator
* **Goal:** Implement database connection creation, credential testing, and encrypted persistence.
* **Prerequisites:** TASK-02, TASK-04, TASK-05.
* **Implementation Details:**
  - Create internal database model `DatabaseConnection` in Alembic migrations.
  - Implement `POST /api/v1/workspaces/{ws_id}/connections` to test connection over TLS and save encrypted credentials.
  - Implement `GET /api/v1/workspaces/{ws_id}/connections` returning sanitized connection lists (no passwords).
  - Enforce TLS (`sslmode=require`) and 5-second socket connect timeout.
* **Acceptance Criteria:**
  - Valid connection credentials successfully verify and persist.
  - Invalid credentials return specific error without exposing stack traces.
  - Response never includes plaintext passwords or full connection URIs.
* **Verification Steps:**
  - Integration test against `customer-demo-postgres` verifies connection creation and retrieval.

---

## 5. Milestone 3: Schema Discovery & Introspection

### TASK-07: PostgreSQL Schema Introspection Engine
* **Goal:** Introspect target PostgreSQL database to discover tables, columns, data types, primary keys, and foreign keys.
* **Prerequisites:** TASK-06.
* **Implementation Details:**
  - Implement `PostgresSchemaExtractor` in `apps/api/app/services/introspection.py`.
  - Query `information_schema` and PostgreSQL catalogs (`pg_class`, `pg_attribute`, `pg_constraint`).
  - Extract estimated row counts from `pg_class.reltuples`.
  - Build typed schema representation matching the Schema Metadata Contract.
* **Acceptance Criteria:**
  - Introspecting `customer_demo_db` correctly identifies `customers`, `orders`, and `order_items`.
  - Foreign key relation `orders.customer_id -> customers.id` is correctly mapped.
  - System schemas (`pg_catalog`, `information_schema`) are excluded.
* **Verification Steps:**
  - Unit/integration test verifies schema extraction output matches expected JSON structure.

---

### TASK-08: Schema Metadata Persistence & Inclusion/Exclusion Filter API
* **Goal:** Persist discovered schema in application database and provide table/column filtering endpoints.
* **Prerequisites:** TASK-07.
* **Implementation Details:**
  - Create `SchemaMetadata` model in application database.
  - Implement `GET /api/v1/workspaces/{ws_id}/connections/{conn_id}/schema`.
  - Implement `PATCH /api/v1/workspaces/{ws_id}/connections/{conn_id}/schema/filter` to toggle table exclusion.
* **Acceptance Criteria:**
  - Schema can be fetched quickly from cache.
  - Excluded tables are marked with `is_excluded: true` and excluded from AI context.
* **Verification Steps:**
  - Test setting a table to excluded and verifying it is filtered out of prompt context generation.

---

### TASK-09: Frontend Connection & Schema Management Views
* **Goal:** Build UI for adding connections, viewing discovered schema, and configuring table exclusions.
* **Prerequisites:** TASK-03, TASK-08.
* **Implementation Details:**
  - Build Connection Modal in Next.js with host, port, database, user, password, and SSL toggle.
  - Build Schema Tree Viewer displaying discovered tables, columns, and relationship badges.
  - Add switches to include/exclude specific tables.
* **Acceptance Criteria:**
  - User can submit connection form and see instant connection status.
  - Discovered tables render in a clean UI with column types and foreign key indicators.
* **Verification Steps:**
  - Manual verification in browser connecting to local demo customer database.

---

## 6. Milestone 4: SQL Safety Engine & AI Query Generation

### TASK-10: Multi-Pass `sqlglot` AST Safety Validator
* **Goal:** Implement comprehensive SQL parsing and security validation blocking all non-read-only queries.
* **Prerequisites:** TASK-02.
* **Security Critical:** Yes.
* **Implementation Details:**
  - Implement `SQLValidator` in `apps/api/app/core/security/sql_validator.py` using `sqlglot`.
  - Enforce single statement (`len(parsed) == 1`).
  - Enforce root is `sqlglot.exp.Select`.
  - Traverse CTEs and block any containing `Insert`, `Update`, `Delete`, `Merge`.
  - Walk full AST and block `Into`, `Create`, `Drop`, `Alter`, `Command`, `Transaction`.
  - Block functions in `DISALLOWED_FUNCTIONS` (`pg_sleep`, `lo_export`, `pg_terminate_backend`, etc.).
  - Enforce or inject `LIMIT 500`.
* **Acceptance Criteria:**
  - Single `SELECT` statements with joins pass.
  - Semicolon-delimited queries fail.
  - Data-modifying CTEs fail.
  - `SELECT ... INTO` fails.
  - `pg_sleep` fails.
  - Queries lacking `LIMIT` have `LIMIT 500` appended.
* **Verification Steps:**
  - Comprehensive suite of 25+ test cases in `apps/api/tests/test_sql_validator.py`.

---

### TASK-11: Google Gemini 2.0 Flash Client with Structured Outputs
* **Goal:** Integrate Gemini 2.0 Flash via unified `google-genai` SDK using Pydantic structured output.
* **Prerequisites:** TASK-08, TASK-10.
* **Implementation Details:**
  - Configure `google-genai` client using `GEMINI_API_KEY`.
  - Define prompt template assembling schema context and user question.
  - Configure `generate_content` with `response_mime_type="application/json"` and `response_schema=AIQueryResponse`.
  - Parse response into `thought_process`, `sql_query`, and `visualization`.
* **Acceptance Criteria:**
  - Prompt returns valid `AIQueryResponse` instance.
  - Generated SQL adheres strictly to PostgreSQL syntax and schema tables.
  - Visualization configuration properly specifies chart type and column bindings.
* **Verification Steps:**
  - Mocked and real API integration test in `apps/api/tests/test_ai_service.py`.

---

### TASK-12: Read-Only Query Execution Pipeline
* **Goal:** Execute validated queries against customer PostgreSQL with strict timeouts and isolation.
* **Prerequisites:** TASK-06, TASK-10.
* **Security Critical:** Yes.
* **Implementation Details:**
  - Implement `DirectPostgresQueryExecutor` in `apps/api/app/services/query_executor.py`.
  - Configure asyncpg with `server_settings={"default_transaction_read_only": "on", "statement_timeout": "15000", "lock_timeout": "5000"}`.
  - Execute within `BEGIN TRANSACTION READ ONLY` isolation block.
  - Cap result rows using `fetchmany(501)` and measure execution latency.
* **Acceptance Criteria:**
  - Valid `SELECT` executes and returns rows and column metadata.
  - Query running longer than 15 seconds is terminated by PostgreSQL and returns clean timeout error.
  - Result rows over 500 are flagged as truncated.
* **Verification Steps:**
  - Integration test verifying query execution and timeout enforcement.

---

## 7. Milestone 5: Chat Interface & Visualization (Vertical Slice 1)

### TASK-13: Natural-Language Chat Interface with Query History
* **Goal:** Build conversational chat UI for submitting questions and inspecting generated SQL.
* **Prerequisites:** TASK-03, TASK-11, TASK-12.
* **Implementation Details:**
  - Build chat drawer/panel with message history.
  - Render user prompts, AI thought process accordion, and formatted SQL code block with copy button.
  - Handle loading states and error messages cleanly.
* **Acceptance Criteria:**
  - User can type question and see optimistic loading state.
  - Response displays thought reasoning, validated SQL, and execution metrics (time, row count).
* **Verification Steps:**
  - Verification in browser from prompt to SQL display.

---

### TASK-14: Interactive TanStack Data Grid & Recharts Visualizer
* **Goal:** Render query results dynamically as either an interactive table or a chart based on AI response.
* **Prerequisites:** TASK-13.
* **Implementation Details:**
  - Build `ResultGrid` component using TanStack Table v8 with column sorting and pagination.
  - Build `ResultVisualizer` component supporting Recharts: Bar Chart, Line Chart, Pie Chart, and Metric Card.
  - Add CSV export button for table data.
* **Acceptance Criteria:**
  - Tabular queries render sortable, paginated data grid.
  - Analytical questions (e.g. *"Monthly order trends"*) render appropriate Recharts visualization.
  - User can toggle between chart view and raw table view.
* **Verification Steps:**
  - Verify rendering of both tabular and charted results in browser.
  - **VERTICAL SLICE 1 IS COMPLETE AND READY FOR FULL VERIFICATION.**

---

## 8. Milestone 6: Generated Admin Interface

### TASK-15: Dynamic Schema-Driven Table Grid (`/admin/[connId]/[table]`)
* **Goal:** Generate table browsing interface directly from schema metadata without hardcoded pages.
* **Prerequisites:** TASK-08, TASK-14.
* **Implementation Details:**
  - Implement Next.js dynamic route `app/admin/[connectionId]/[tableName]/page.tsx`.
  - Fetch schema metadata for selected table and query paginated rows (`LIMIT 50 OFFSET X`).
  - Render column types, formatted values, and primary key indicators.
* **Acceptance Criteria:**
  - Navigating to `/admin/{conn_id}/customers` displays customers data with pagination and sorting.
  - No frontend code was hand-written specifically for the `customers` table.
* **Verification Steps:**
  - Verify dynamic table rendering for multiple distinct tables in demo database.

---

### TASK-16: Record Inspector & Foreign Key Relational Navigator
* **Goal:** Render single-record detail view with clickable foreign key navigation.
* **Prerequisites:** TASK-15.
* **Implementation Details:**
  - Implement route `app/admin/[connectionId]/[tableName]/[recordId]/page.tsx`.
  - Render key-value record inspector.
  - Render relationship chips: clicking foreign key column navigates to linked record; reverse relations displayed as sub-tables.
* **Acceptance Criteria:**
  - Clicking an order record displays its attributes.
  - Clicking `customer_id: 42` navigates to `/admin/{conn_id}/customers/42`.
* **Verification Steps:**
  - Verify relational traversal across tables.

---

## 9. Milestone 7: Hardening, Audit Logging & Integration Suite

### TASK-17: Immutable Audit Logging Pipeline
* **Goal:** Persist audit events for every AI query and connection access.
* **Prerequisites:** TASK-12.
* **Implementation Details:**
  - Create `AuditLog` table in application database.
  - Record: timestamp, user ID, workspace ID, connection ID, natural language prompt, executed SQL, execution duration ms, row count returned, error status.
  - Expose `GET /api/v1/workspaces/{ws_id}/audit-logs` endpoint.
* **Acceptance Criteria:**
  - Every executed query writes an audit record.
  - Failed or blocked queries record the safety violation reason.
* **Verification Steps:**
  - Integration test asserts audit log creation on both successful and blocked queries.

---

### TASK-18: End-to-End Integration Test Suite with Testcontainers
* **Goal:** Comprehensive automated integration test suite validating the entire backend stack against real PostgreSQL instances.
* **Prerequisites:** TASK-10, TASK-12, TASK-17.
* **Implementation Details:**
  - Configure `pytest` suite using `testcontainers[postgres]`.
  - Spin up fresh PostgreSQL instance per test session.
  - Run complete matrix: valid queries, blocked DDL/DML, timeouts, SSRF blocks, auth failures.
* **Acceptance Criteria:**
  - Complete integration test suite executes in CI/CD without mocks.
  - 100% of security test matrix cases pass.
* **Verification Steps:**
  - `pytest apps/api/tests/integration/` passes with exit code 0.
