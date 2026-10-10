# AI Agent Operating Guidelines (`AGENTS.md`)

Welcome, AI Agent. This document outlines the mandatory operational standards, security guardrails, architecture principles, and coding conventions for contributing to the **AskDB** repository.

---

## 1. Core Operating Principles

1. **Adhere to the Task Backlog:**
   - Implementation work must strictly follow the dependency order outlined in [`docs/06-task-backlog.md`](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md).
   - Never skip prerequisite tasks. Verify acceptance criteria before marking tasks complete.
   - Maintain [`docs/07-progress.md`](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/07-progress.md) to reflect current progress, blockers, and the single recommended next task.
2. **Prioritize Vertical Slice 1:**
   - Deliver the complete, minimal end-to-end path (Local DB -> Connect -> Introspect -> Prompt -> Validate SQL -> Render TanStack Table) before building secondary features.
3. **No Premature Feature Expansion:**
   - Do not implement write operations, local connector tunnels, MySQL/MSSQL dialects, or enterprise SSO during MVP milestones. Keep them as documented post-MVP extensions.

---

## 2. Non-Negotiable Security Guardrails

As an AI agent writing code for this project, you must enforce the following security invariants at all times:

### 2.1 Untrusted Model Output & SQL Validation
- **Never execute raw AI output directly.** All generated SQL must be parsed and validated through the multi-pass `sqlglot` engine (`apps/api/app/core/security/sql_validator.py`).
- **Single Statement Only:** Reject queries if `len(parsed) != 1`. Semicolons and stacked statements are strictly prohibited.
- **Root SELECT Enforcement:** The root AST node must be `sqlglot.exp.Select`.
- **Data-Modifying CTE Detection:** Recursively inspect all CTEs. If any CTE contains `Insert`, `Update`, `Delete`, or `Merge`, reject immediately.
- **Forbidden Functions:** Disallow system functions with side effects (`pg_sleep`, `lo_export`, `pg_terminate_backend`, `dblink_exec`, `pg_read_file`, etc.).
- **Bounded Result Injection:** Inject `LIMIT 500` if no limit is present; clamp existing limits to a maximum of 500. Driver must enforce a hard cap using `fetchmany(501)`.

### 2.2 Four-Layer Database Enforcement
Always verify that database queries execute with defense-in-depth:
1. Guidance requiring a dedicated read-only PostgreSQL role.
2. Connection-level `server_settings={"default_transaction_read_only": "on", "statement_timeout": "15000", "lock_timeout": "5000"}` in `connect_args`.
3. Explicit `BEGIN TRANSACTION READ ONLY` or `postgresql_readonly=True` transaction execution options.
4. Application AST validation.

### 2.3 SSRF Protection
- Never establish a socket connection to a user-provided host without first validating it via `NetworkGuard`.
- Resolve hostnames via DNS and reject loopback (`127.0.0.0/8`, `::1`), link-local / cloud metadata (`169.254.169.254`), and private RFC 1918 ranges unless `ALLOW_PRIVATE_NETWORKS=True` is explicitly set in development.
- Enforce TLS (`sslmode=require`) by default on all customer connections.

### 2.4 Credential Safety & Secret Redaction
- Encrypt connection credentials at rest using Fernet / `MultiFernet`.
- Use `pydantic.SecretStr` for sensitive fields.
- Strip passwords from all API response models (`ConnectionRead`).
- **Never include customer database credentials in AI prompts or LLM context.**

### 2.5 Deterministic Schema-Driven Admin UI
- **Never generate arbitrary React or JavaScript application code via LLM for browser execution.**
- The admin interface must use pre-built, schema-driven React components powered by shadcn/ui and TanStack Table.

---

## 3. Technology Stack & Coding Standards

### 3.1 Backend (`apps/api`)
- **Runtime:** Python 3.12+
- **Framework:** FastAPI with async path operations (`async def`).
- **ORM / Database:** SQLAlchemy 2.0 (async style `select()`), `asyncpg`.
- **Validation:** Pydantic v2 models (`BaseModel`).
- **AI SDK:** Unified `google-genai` Python SDK targeting model `gemini-2.0-flash`.
- **Code Style:** Black formatting, Ruff linter, type hints on all function signatures.

### 3.2 Frontend (`apps/web`)
- **Framework:** Next.js 14+ (App Router), React 18+, TypeScript.
- **Styling:** Tailwind CSS with CSS variables.
- **UI Components:** shadcn/ui headless primitives (Radix UI).
- **Tables & Visuals:** TanStack Table v8, Recharts.
- **Code Style:** Strict TypeScript (`strict: true`), ESLint, Prettier.

### 3.3 Infrastructure (`infra`)
- Docker Compose for local PostgreSQL instances (`app-postgres` on 5432, `customer-demo-postgres` on 5433).

---

## 4. Testing Standards

- **Backend:** `pytest` with `pytest-asyncio`.
- **Integration Tests:** Use `testcontainers[postgres]` to spin up real PostgreSQL containers. Avoid brittle database mocks for SQL validation or schema discovery tests.
- **Security Tests:** Every security guardrail (SSRF, AST validation, timeout enforcement, credential redaction) must have dedicated negative test cases verifying that malicious or invalid inputs are cleanly rejected.

---

## 5. Documentation Maintenance

- Keep documentation synchronized with implementation changes.
- Never duplicate extensive technical specifications across files; link to authoritative documents in `docs/`:
  - `docs/01-mvp-core.md`: Core MVP specifications and security rules.
  - `docs/05-architecture-and-data-flow.md`: Contracts and data flows.
  - `docs/06-task-backlog.md`: Implementation tasks and acceptance criteria.
  - `docs/07-progress.md`: Ongoing progress tracking.
