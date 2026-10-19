# AGENTS.md — QueryForge AI

Instructions for AI coding agents working on this repository.

## Project Summary

QueryForge AI is an open-source, self-hosted tool that connects to PostgreSQL databases and lets developers ask natural-language questions, view validated read-only query results with visualizations, and browse an auto-generated admin panel. Licensed under Apache 2.0.

**Current state:** Early foundation. The backend has a health endpoint and configuration; the frontend has the default Next.js starter page. Architecture docs in `docs/` are ahead of implementation. The MVP is strictly read-only — do not implement write operations or other post-MVP features unless explicitly asked.

## Technology Stack

**Backend (`apps/api`):** FastAPI · Python 3.12+ · Pydantic v2 · SQLAlchemy 2.0 async + asyncpg · Alembic · sqlglot (SQL AST parsing) · cryptography (Fernet encryption) · bcrypt + PyJWT (auth) · google-genai SDK (Gemini) · pytest + pytest-asyncio + httpx + testcontainers

**Frontend (`apps/web`):** Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS 4 · TanStack Table v9 · Recharts · Lucide React · Geist fonts · Path alias `@/*` → `./src/*`

**Important:** `apps/web` uses Next.js 16 which has breaking changes. Consult `node_modules/next/dist/docs/` before writing Next.js code.

## Code Quality

- Use type annotations on all Python function signatures. Use Pydantic models for API input/output.
- Use TypeScript strict mode in the frontend. Avoid `any`.
- Follow existing naming: `snake_case` in Python, `camelCase`/`PascalCase` per TypeScript conventions, `SCREAMING_SNAKE` for constants and settings.
- Keep functions focused. Extract shared logic into utilities rather than duplicating it.
- All backend I/O (database, HTTP, AI calls) must be `async`.
- Handle errors explicitly: raise `HTTPException` with appropriate status codes in the backend; show loading, error, and empty states in the frontend.
- Use absolute imports in Python (`from app.core.config import settings`) and `@/` aliases in TypeScript (`import { cn } from "@/lib/utils"`).

## Architecture

**Monorepo layout — two independent apps communicating via REST:**

```
apps/api/        → FastAPI backend
  app/
    main.py      → App factory, middleware, health routes
    core/        → config.py (Pydantic Settings), database, security utilities
    models/      → SQLAlchemy ORM models (internal DB)
    schemas/     → Pydantic request/response schemas
    routers/     → FastAPI APIRouter modules versioned by release (routers/v1/, future routers/v2/)
    services/    → Business logic (schema discovery, AI pipeline, query execution)
    utils/       → Shared helpers (network guard, SQL validator)
  alembic/       → Database migrations
  tests/         → pytest tests

apps/web/        → Next.js frontend
  src/
    app/         → App Router pages and layouts
    components/  → Reusable React components
    hooks/       → Custom hooks
    lib/         → Utilities (cn() in utils.ts) and API client
    types/       → Shared TypeScript types

docs/            → Architecture and feature specifications (authoritative)
```

- **Internal DB vs. target DB:** The internal PostgreSQL database stores application state (connections, encrypted credentials, cached schema, query history). It never stores customer data rows.
- All configurable values go through `app/core/config.py` via environment variables. New env vars must also be added to `.env.example`.
- Use FastAPI dependency injection (`Depends()`) for sessions, auth, and services.
- Use the `cn()` helper from `@/lib/utils` for Tailwind class merging in the frontend.
- Do not add abstraction layers, microservice boundaries, or plugin systems until a concrete need exists.
- Detailed architecture docs live in `docs/architecture/`. Reference them; do not duplicate their content.

## Security

- **Secrets:** Never hardcode secrets, API keys, or credentials. Use environment variables via `app/core/config.py`. The `.env` files are gitignored.
- **Credential storage:** Encrypt database passwords and user-provided AI model API keys at rest with Fernet (`ENCRYPTION_MASTER_KEY`). Never return unmasked passwords or keys in API responses, logs, or error messages.
- **SSRF:** Validate target database hostnames before connecting. Block cloud metadata endpoints (`169.254.169.254`) even in self-hosted mode (`ALLOW_PRIVATE_NETWORKS=true`).
- **SQL safety:** Validate all LLM-generated SQL through `sqlglot` AST parsing — do not rely on prompts, regex, or the LLM's assertions alone. Enforce: single SELECT statement, no DDL/DML, no dangerous functions (`pg_sleep`, `lo_export`, etc.), LIMIT clamping. See `docs/architecture/ai-query-pipeline.md` §5 for the full validation spec.
- **Database execution:** Use read-only transactions (`default_transaction_read_only=on`) and statement timeouts (`STATEMENT_TIMEOUT_MS`, default 15s) on all target database connections.
- **Object authorization:** Verify table/column names in queries against the cached schema. Reject references to unknown or excluded objects.
- **Credential isolation:** The LLM and frontend must never receive database passwords or connection strings. The frontend receives only masked previews of API keys (e.g. `sk-...4a1b`).
- **Input validation:** Use Pydantic for all API inputs. Use parameterized queries for admin panel operations — never concatenate user strings into SQL.
- **Connection Onboarding Rules:** Do not save credentials before validation. Do not trigger background tasks early. Atomically persist encrypted connection and schema metadata together. Separate connection validity from schema validity. Close temporary resources promptly. Keep all error messages safe and credentials redacted (see docs/architecture/database-connections.md §8).

## AI & Database Features

- **Separation of concerns:** Keep the agent orchestrator, tool implementations (schema lookup, SQL execution), SQL validator, and LLM client as distinct components with clear interfaces.
- **User-provided AI Model API (BYOK):** Allow users to configure their own AI model API key and provider/model. Decrypt keys dynamically using Fernet to instantiate client adapters per query session.
- **Iterative discovery:** For large schemas (100+ tables), the agent should explore incrementally using tools rather than injecting the entire schema into a single prompt. See `docs/architecture/system-overview.md` §6.3.
- **Bounding:** Enforce limits on tool-call iterations, wall-clock time, token consumption, and retries per query session. Detect and reject duplicate tool calls that provide no new information.
- **Provider abstraction:** Accept the LLM client as a dependency so it can be replaced. Isolate provider-specific logic in adapter code.
- **Untrusted data:** Treat user questions, database metadata, and query results as untrusted data that must not override system instructions or bypass safety checks.
- **Runtime prompts vs. AGENTS.md:** System prompts, tool schemas, and orchestration logic sent to the LLM at query time belong in `apps/api` source code, not in this file.
- **Schema discovery details:** See `docs/architecture/database-connections.md`.
- **AI pipeline details:** See `docs/architecture/ai-query-pipeline.md`.

## Testing

- Add or update tests for meaningful changes. Use the established pattern: `pytest` with `httpx.AsyncClient` + `ASGITransport` for API tests (see `tests/test_health.py`), `testcontainers[postgres]` for integration tests against real PostgreSQL.
- `pytest-asyncio` is configured with `asyncio_mode = "auto"` in `pyproject.toml`.
- Run `python -m pytest` from `apps/api/` before declaring backend work complete.
- Run `npx tsc --noEmit` and `npm run lint` from `apps/web/` for frontend changes.
- Never claim tests or checks passed without actually running them.

## Development Workflow

1. **Inspect first.** Read the files you plan to modify, their imports, dependents, and related tests before making changes.
2. **Focused changes.** Make targeted edits. Do not rewrite entire files when surgical changes suffice.
3. **Preserve existing work.** Do not overwrite unrelated code, delete tests without justification, or silently disable functionality.
4. **Verify.** Run relevant tests, type checks, and linting after making changes.
5. **No phantom dependencies.** Do not add libraries without clear justification. Check if existing dependencies already cover the need.

## Documentation

- Update docs when you change APIs, configuration, architecture, or setup procedures.
- The authoritative sources are the files in `docs/` and `docs/architecture/`. Reference them rather than duplicating content.
- When adding a new environment variable, add it to both `app/core/config.py` and `apps/api/.env.example`.
- Keep this `AGENTS.md` concise. Detailed specifications belong in `docs/architecture/`.
