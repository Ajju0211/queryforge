# Future Roadmap: Post-MVP Expansion Pipeline

> **Implementation Status:** 📋 **Roadmap Overview (Phases 2 through 5)**  
> **MVP Scope:** PostgreSQL only, direct TLS connection, read-only queries, and schema-driven admin interface. This document defines the evolutionary roadmap for enterprise readiness and ecosystem expansion.

---

## 1. Roadmap Phases & Implementation Sequence

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: MVP Core (Current)                            │
│ - PostgreSQL Only, Direct TLS, Read-Only Chat,         │
│ - Schema-driven Admin UI, Modular Monolith             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Actionable Data & Connectivity                │
│ - Confirmed Write Actions (02-feature-write-actions.md)│
│ - Local Database Connector (03-feature-local-connector)│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: Engine Expansion & Multi-Database Support     │
│ - MySQL & MariaDB Dialect Support                      │
│ - Microsoft SQL Server (MSSQL) Support                 │
│ - SQLite (for embedded / edge local workspaces)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: Autonomous Intelligence & Background Work     │
│ - Scheduled AI Reports & Slack/Email Notifications     │
│ - Anomaly Detection & Metric Alerting                  │
│ - Persistent Pinned Dashboards                         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 5: Enterprise Governance & Extensibility         │
│ - Enterprise SSO (SAML 2.0, Okta, Azure AD, OIDC)      │
│ - Granular RBAC (Table & Column Level Policies)        │
│ - Public Template & Extension Marketplace              │
└────────────────────────────────────────────────────────┘
```

---

## 2. Expansion Modules Breakdown

### 2.1 Multi-Database Dialect Support (Phase 3)
* **Goal:** Expand connectivity beyond PostgreSQL to MySQL, SQL Server, and SQLite.
* **Dependencies on Earlier Phases:**
  - Pluggable `DialectAdapter` architecture in the backend engine.
  - Verification of `sqlglot` transpilation rules and dialect-specific keywords for MySQL/MSSQL.
* **Security & Operational Requirements:**
  - Adapting SQL AST safety rules to MySQL (e.g., handling backtick quoting, stored procedure calls, `OUTFILE` file write attempts).
  - Dialect-specific connection security (e.g., handling TLS verification and timeouts in `asyncmy` or `aioodbc`).
* **Implementation Strategy:**
  Maintain database-specific dialect adapters implementing the `DatabaseAdapter` interface:
  - PostgreSQL: `asyncpg` + `sqlglot.dialects.Postgres`
  - MySQL: `asyncmy` + `sqlglot.dialects.MySQL`
  - SQL Server: `aioodbc` + `sqlglot.dialects.TSQL`

### 2.2 Scheduled AI Reports & Alerting (Phase 4)
* **Goal:** Enable autonomous background report generation (e.g. *"Every Monday at 9 AM, summarize net revenue retention and send to #finance in Slack"*).
* **Dependencies on Earlier Phases:**
  - Stable query execution pipeline and visualization engine.
  - Adding asynchronous background worker infrastructure: Redis and an async job queue (e.g. `Arq` or `Celery`).
* **Security & Operational Requirements:**
  - Secure credential storage for third-party webhook integrations (Slack, Discord, SendGrid).
  - Rate limiting on LLM token consumption for automated background cron jobs.
  - Guarding against stale schema drift when cron jobs execute autonomously.

### 2.3 Persistent Visual Dashboards (Phase 4)
* **Goal:** Allow users to pin charts and summary cards generated from chat sessions into shareable, real-time dashboards.
* **Dependencies on Earlier Phases:**
  - AI structured visualization outputs (Recharts configurations).
  - Workspace dashboard persistence tables in internal application DB.
* **Security & Operational Requirements:**
  - Dashboard view-only sharing tokens with configurable expiration.
  - Caching query results with configurable TTL to prevent database overload when dashboards are viewed concurrently.

### 2.4 Enterprise Governance, SSO & Granular RBAC (Phase 5)
* **Goal:** Enable adoption in enterprise IT environments with strict compliance requirements.
* **Dependencies on Earlier Phases:**
  - Workspace and membership data models from MVP.
* **Security & Operational Requirements:**
  - SAML 2.0 / OIDC integrations (Okta, Google Workspace, Azure Active Directory).
  - SCIM 2.0 user provisioning and automated deprovisioning.
  - Granular table and column masking policies (e.g. *"Financial Analyst can query Orders, but cannot view PII columns in Customers"*).
  - Immutable enterprise audit log exporting (SIEM integration via Syslog, Splunk, or S3).

---

## 3. Related Documentation
- [01-mvp-core.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/01-mvp-core.md) - MVP Core Specification.
- [02-feature-write-actions.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/02-feature-write-actions.md) - Confirmed write actions (Phase 2).
- [03-feature-local-connector.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/03-feature-local-connector.md) - Local database connector (Phase 2/3).
- [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md) - Architecture & data flows.
- [06-task-backlog.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md) - Implementation task backlog.
