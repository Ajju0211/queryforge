# apps/api - Backend REST API

## Overview
This directory contains the FastAPI backend service for **AskDB**.

## Technology Stack
- **Framework:** FastAPI (Python 3.12+)
- **ORM & DB Access:** SQLAlchemy 2.0 (async), `asyncpg`
- **Migrations:** Alembic
- **SQL Validation:** `sqlglot` (PostgreSQL dialect)
- **Credential Encryption:** `cryptography` (Fernet + `MultiFernet`)
- **AI Client:** Unified `google-genai` SDK with Gemini 2.0 Flash
- **Testing:** `pytest`, `pytest-asyncio`, `testcontainers[postgres]`

## Implementation Scope
- JWT authentication and workspace isolation
- Credential encryption and key rotation
- Network SSRF guard and TLS connection verification
- PostgreSQL schema introspection service
- Multi-pass SQL AST validation engine
- Read-only query execution with strict statement timeouts
- Audit logging pipeline

## Next Steps
See [docs/06-task-backlog.md](../../docs/06-task-backlog.md#task-02-fastapi-core-service-setup-with-async-sqlalchemy--alembic) for implementation tasks (TASK-02, TASK-04, TASK-05, TASK-06, TASK-07, TASK-08, TASK-10, TASK-11, TASK-12, TASK-17, TASK-18).
