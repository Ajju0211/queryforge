# Feature Specification: Confirmed Write Actions (Post-MVP)

> **Implementation Status:** ⏸️ **Post-MVP (Phase 2 Expansion)**  
> **MVP Scope:** Strictly Read-Only queries. This document details the architectural preparation, security guardrails, and implementation plan for adding write operations in Phase 2 without complicating the MVP.

---

## 1. Feature Objective

Enable users to perform targeted database modifications (such as updating order statuses, inserting records, or soft-deleting obsolete rows) using natural language, backed by strict impact preview, explicit two-phase confirmation, transaction rollbacks, and permanent audit logging.

---

## 2. Dependencies on MVP Infrastructure

Confirmed Write Actions build directly upon MVP abstractions and must not be implemented until the following MVP systems are production-ready:

1. **Schema Introspection Engine:** Primary keys and foreign key constraints must be reliably indexed to generate unambiguous `WHERE` clauses (see [01-mvp-core.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/01-mvp-core.md)).
2. **Modular Query Executor (`QueryExecutor`):** The execution engine must provide clean abstraction boundaries separating read-only and transactional write pipelines (see [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md)).
3. **Workspace Authorization & Audit Log Pipeline:** Persistent logging in the application database to track actor, timestamp, connection, prompt, and SQL statement.
4. **WebSocket or SSE Streaming Response Channel:** Real-time state updates for multi-step confirmation workflows.

---

## 3. The 6-Step Safe Execution Lifecycle

Natural-language write requests must never execute directly or automatically. They must follow this deterministic lifecycle:

```
[User Prompt: "Change status of order #105 to Shipped"]
                    │
                    ▼
[Step 1: LLM Action Proposal]
 Backend instructs LLM to output a WriteActionProposal JSON
 (Target table, mutation type, target PKs, proposed changes)
                    │
                    ▼
[Step 2: Impact Analysis & Dry Run]
 Backend validates proposal against schema, builds parameterized SQL,
 and executes a dry-run SELECT to inspect current state of affected rows
                    │
                    ▼
[Step 3: UI Preview & Confirmation Token]
 Frontend displays a diff preview modal showing exactly which rows and columns will change.
 Backend issues a short-lived confirmation token (TTL: 60s) bound to the SQL hash.
                    │
                    ▼
[Step 4: Explicit User Confirmation]
 User reviews diff and clicks "Confirm & Apply Change".
 Frontend submits POST /api/v1/write-actions/confirm with the confirmation token.
                    │
                    ▼
[Step 5: Transactional Execution & Verification]
 Backend verifies token and user permissions, opens a read-write transaction,
 executes the statement, verifies affected row count matches expectation, and commits.
                    │
                    ▼
[Step 6: Immutable Audit Logging]
 Action, user ID, workspace ID, prompt, SQL statement, pre-state diff, and post-state diff
 are written to the application database audit table.
```

---

## 4. Security & Safety Guardrails

### 4.1 Mandatory Primary-Key & WHERE Clause Enforcement
- The backend AST validator strictly forbids any `UPDATE` or `DELETE` statement that lacks an explicit `WHERE` clause.
- Bulk updates that do not target specific primary keys or indexed predicates are rejected by default.

### 4.2 Blast-Radius Thresholds (Row Count Guard)
- A hard safety threshold (e.g. maximum 25 rows) is enforced for natural-language mutations.
- If the dry-run impact analysis reveals that the statement would affect more rows than the threshold, the operation is blocked with a warning requiring administrative override or manual SQL execution.

### 4.3 Two-Phase Confirmation Cryptographic Token
- When the backend generates the impact preview, it signs a short-lived confirmation token (JWT or HMAC):
  ```json
  {
    "action_id": "uuid",
    "connection_id": "uuid",
    "workspace_id": "uuid",
    "user_id": "uuid",
    "sql_hash": "sha256(canonical_sql)",
    "expected_rows": 1,
    "exp": 1728560000
  }
  ```
- The execution endpoint verifies that the token has not expired and that the SQL hash strictly matches the previewed statement.

### 4.4 Transaction Atomicity & Row-Level Security
- Execution occurs within an explicit transaction (`BEGIN ... COMMIT`). If the number of affected rows does not equal `expected_rows`, the transaction is rolled back immediately (`ROLLBACK`).
- If customer PostgreSQL databases have Row-Level Security (RLS) enabled, the backend applies the session identity (`SET LOCAL ROLE ...` or `SET LOCAL app.current_user_id = ...`) to respect customer database policies.

### 4.5 Separate Write Credentials (Optional Customer Isolation)
- Workspaces may configure separate read and write database credentials. If only read-only credentials were provided, write actions are disabled automatically at the workspace level.

---

## 5. Architectural Compatibility with MVP

To ensure write actions do not complicate the MVP:
1. **Executor Interface:** The MVP defines an abstract `QueryExecutor` protocol with an `execute_readonly()` method. In Phase 2, `execute_write_transaction()` is implemented on the same base engine without altering the read-only paths.
2. **Schema Metadata Contract:** The schema metadata defined in MVP already extracts primary keys and foreign keys, so no schema discovery changes are required for Phase 2.
3. **Admin UI Compatibility:** The generated admin detail page in Next.js will simply enable an "Edit Row" button that submits through the Phase 2 write confirmation flow.

---

## 6. Phase 2 Acceptance Criteria

1. Submitting a natural-language write request produces a structured preview modal in the UI and does not modify the customer database.
2. The preview displays the exact target table, target primary key, old value, and proposed new value.
3. Attempting to update without a primary key or `WHERE` clause fails with a validation error.
4. Clicking "Confirm" within 60 seconds successfully executes the mutation in a transaction and returns updated data.
5. Expired tokens (older than 60s) or tampered tokens are rejected with a 400 error.
6. The audit log table records every confirmed write action with the user ID, timestamp, prompt, and executed SQL.

---

## 7. Confirmed Decisions vs. Open Questions

### Confirmed Decisions
- [x] Phase 2 feature; completely excluded from MVP execution.
- [x] Two-phase confirmation model with short-lived tokens.
- [x] Strict primary-key requirement and mandatory `WHERE` clause validation.
- [x] Immutable audit logging in internal application database.

### Open Questions (To be decided prior to Phase 2 implementation)
1. **Dry-Run Rollbacks vs. State Diffing:** Should impact analysis perform a `SELECT` diff or execute the statement inside a rolled-back transaction (`BEGIN; UPDATE ...; ROLLBACK;`)? *(Recommendation: Use SELECT diffing to prevent transaction locks on high-concurrency databases).*
2. **Soft Deletes vs. Hard Deletes:** Should the natural language engine prefer soft-deleting (setting `deleted_at = NOW()`) when such columns are detected?

---

## 8. Related Documentation
- [01-mvp-core.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/01-mvp-core.md) - MVP Core Specification & Read-Only Engine.
- [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md) - Architectural data flows and API contracts.
- [06-task-backlog.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md) - Implementation task roadmap.
