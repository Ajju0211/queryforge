# AI Database Workspace

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-documentation%20audited-emerald.svg)](docs/07-progress.md)

An open-source, developer-first AI Database Workspace where you can connect your PostgreSQL database, ask questions in natural language, explore data with interactive visualizations, and instantly navigate an auto-generated admin interface—without manually building frontend pages.

Built with a focus on **strict query safety**, **defense-in-depth security**, and **clean modular architecture**, designed for straightforward self-hosting or scalable multi-tenant SaaS deployment.

---

## 🚀 Key Features

* **Natural-Language to Safe SQL:** Query your database conversationally. Questions are translated into optimized, read-only PostgreSQL queries using Google Gemini 2.0 Flash.
* **Multi-Layer Query Safety:** Untrusted AI output is verified via `sqlglot` AST parsing, blocking multi-statement attacks, data-modifying CTEs, unauthorized commands, and system-level functions before reaching your database.
* **Schema-Driven Admin Interface:** Dynamic, reusable React data tables and detail inspectors generated directly from schema metadata—no arbitrary runtime code generation.
* **Credential Protection:** Database connection credentials encrypted at rest using Fernet with native `MultiFernet` key rotation support.
* **SSRF & Network Isolation:** Inbound host validation blocking private networks and cloud metadata services (`169.254.169.254`), with mandatory TLS encryption.
* **Modular Monolith Architecture:** Single repository housing a FastAPI backend (`apps/api`) and a Next.js frontend (`apps/web`).

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui | Conversational chat UI, TanStack Table v8 grids, and schema-driven admin pages. |
| **Backend API** | FastAPI, Python 3.12+, Pydantic v2 | REST API, authentication, SSRF guard, schema discovery, and query execution. |
| **Internal DB** | PostgreSQL 16 (Isolated) | Stores application users, workspaces, encrypted credentials, metadata, and audit logs. |
| **DB Access Layer**| SQLAlchemy 2.0 (async), `asyncpg` | Async connection management with connection-level read-only `server_settings`. |
| **Migrations** | Alembic | Internal database schema versioning and migrations. |
| **SQL Validation**| `sqlglot` | Multi-pass AST inspection enforcing read-only `SELECT` and `LIMIT` boundaries. |
| **AI Engine** | Google Gemini 2.0 Flash (`google-genai` SDK) | Cost-conscious structured JSON output (`response_schema`) separating SQL from chart config. |
| **Testing** | `pytest`, `pytest-asyncio`, Testcontainers | True integration tests using isolated PostgreSQL Docker containers. |

---

## 📁 Repository Structure

```
ai-database-workspace/
├── apps/
│   ├── api/                 # FastAPI backend application
│   └── web/                 # Next.js 14 frontend application
├── infra/                   # Docker Compose and local infrastructure definitions
├── docs/                    # Complete architectural and feature documentation
│   ├── 01-mvp-core.md       # MVP specification & security audit
│   ├── 02-feature-write-actions.md   # Confirmed write actions (Phase 2)
│   ├── 03-feature-local-connector.md # Local database connector (Phase 2/3)
│   ├── 04-feature-future-roadmap.md  # Multi-database & enterprise roadmap
│   ├── 05-architecture-and-data-flow.md # Request flows, schemas & contracts
│   ├── 06-task-backlog.md   # Dependency-ordered task breakdown
│   └── 07-progress.md       # Implementation status and next steps
├── .env.example             # Documented environment variables template
├── AGENTS.md                # AI agent operating instructions & safety guidelines
├── CONTRIBUTING.md          # Contribution workflow and coding standards
└── README.md                # Project overview and entry point
```

---

## 📚 Documentation Index

For in-depth architecture, data contracts, and implementation plans, refer to the documentation suite:

1. [**MVP Core Specification** (`docs/01-mvp-core.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/01-mvp-core.md): Complete scope, four-layer read-only enforcement, SSRF prevention, and acceptance criteria.
2. [**Confirmed Write Actions** (`docs/02-feature-write-actions.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/02-feature-write-actions.md): Phase 2 two-phase confirmation protocol and impact diff previews.
3. [**Local Database Connector** (`docs/03-feature-local-connector.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/03-feature-local-connector.md): Phase 2/3 outbound-only tunnel architecture with zero credential transmission.
4. [**Future Roadmap** (`docs/04-feature-future-roadmap.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/04-feature-future-roadmap.md): Multi-database expansion (MySQL/MSSQL), background reports, and enterprise SSO.
5. [**Architecture & Data Flow** (`docs/05-architecture-and-data-flow.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md): Sequence diagrams, backend-frontend schema contract, AI response Pydantic models, and Vertical Slice 1.
6. [**Task Backlog** (`docs/06-task-backlog.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md): Dependency-ordered implementation tasks with verification steps.
7. [**Progress Tracker** (`docs/07-progress.md`)](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/07-progress.md): Current implementation state and the single recommended next task.

---

## 🚦 Implementation Status

The project is currently at the conclusion of the **Documentation Audit & Foundation Setup** stage.

The single recommended next implementation step is:
👉 **[TASK-01: Monorepo Foundation & Docker Compose Environment](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md#task-01-monorepo-foundation--docker-compose-environment)**

---

## 📄 License

Licensed under the [Apache License, Version 2.0](LICENSE).
