# AI Query Pipeline & SQL Safety Architecture

## 1. Objective & Scope

This document specifies the architecture for translating natural-language questions into safe, deterministic, bounded PostgreSQL queries and visualization configurations. It covers prompt engineering with schema context, user-configured AI model integration (Bring-Your-Own-Key / BYOK), multi-pass Abstract Syntax Tree (AST) safety validation using `sqlglot`, and read-only query execution.

---

## 2. Main Components & Responsibilities

```mermaid
graph TD
    subgraph Input["Input Layer"]
        PromptInput["User Prompt & Connection ID"]
    end

    subgraph PromptEngine["Prompt Engineering & LLM"]
        SchemaInjector["Schema Context Injector<br/>- Filter excluded tables<br/>- Inject PKs & FK relationships"]
        KeyManager["AI Credential Vault<br/>- Fetch user/workspace AI key<br/>- Decrypt via Fernet"]
        LLMClient["Dynamic LLM Client Adapter<br/>- User-configured AI Model API key (BYOK)<br/>- Gemini (google-genai) or OpenAI<br/>- Pydantic Structured Output"]
    end

    subgraph ValidationEngine["sqlglot AST Safety Engine (Multi-Pass)"]
        ParseAST["1. Parse to AST (Postgres Dialect)"]
        SingleStmt["2. Verify Single Statement"]
        RootSelect["3. Verify Root is Select"]
        CTEInspection["4. Inspect CTEs for Mutations"]
        ClauseBlacklist["5. Block DDL / DML / INTO Clauses"]
        FunctionBlacklist["6. Block Dangerous Functions (pg_sleep, etc.)"]
        LimitClamp["7. Enforce / Inject LIMIT 500"]
    end

    subgraph ExecutionEngine["Execution & Bounding"]
        AsyncPGExec["DirectPostgresQueryExecutor<br/>- asyncpg with TLS<br/>- default_transaction_read_only = on<br/>- statement_timeout = 15000ms"]
        RowBounding["Result Bounding<br/>- fetchmany(501)<br/>- Flag truncation if > 500"]
        AuditService["Audit Logger<br/>- Prompt, SQL, Time, Rows, Actor"]
    end

    subgraph Output["Output Layer"]
        ResultPayload["Formatted JSON Result<br/>(Columns, Rows, Visualization Config)"]
    end

    PromptInput --> SchemaInjector
    PromptInput --> KeyManager
    KeyManager --> LLMClient
    SchemaInjector --> LLMClient
    LLMClient -->|Structured JSON| ParseAST
    
    ParseAST --> SingleStmt
    SingleStmt --> RootSelect
    RootSelect --> CTEInspection
    CTEInspection --> ClauseBlacklist
    ClauseBlacklist --> FunctionBlacklist
    FunctionBlacklist --> LimitClamp

    LimitClamp -->|Validated SQL| AsyncPGExec
    AsyncPGExec --> RowBounding
    RowBounding --> AuditService
    RowBounding --> ResultPayload
```

| Component | Responsibility |
| :--- | :--- |
| **Schema Context Injector** | Formats database schema metadata (tables, columns, data types, primary keys, foreign keys) into a concise prompt context. Respects user table exclusion settings to preserve token budgets and privacy. |
| **AI Credential Vault** | Securely decrypts the user's stored AI model API key at runtime using Fernet symmetric encryption. |
| **Dynamic LLM Client Adapter** | Dynamically instantiates the LLM client using the user's configured provider API key and model (e.g., Google Gemini via `google-genai` SDK or OpenAI-compatible endpoint). Enforces structured JSON output (`response_schema=AIQueryResponse`) to cleanly separate thought reasoning, SQL, and visualization configuration. |
| **`sqlglot` Multi-Pass AST Validator** | Parses the raw SQL string into an Abstract Syntax Tree. Enforces 6 strict validation passes to guarantee that queries are exclusively read-only and non-destructive before reaching the database. |
| **Query Executor (`DirectPostgresQueryExecutor`)** | Executes validated queries against the customer database within a `BEGIN TRANSACTION READ ONLY` block with a 15-second statement timeout. |
| **Result Bounding Engine** | Fetches at most 501 rows (`fetchmany(501)`). If 501 rows are returned, the result is capped at 500 and marked as truncated to protect memory. |
| **Audit Logger** | Records the connection ID, prompt text, generated SQL, execution duration, and row counts in the internal application database. |

---

## 3. Detailed Data Flow & Validation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Chat Router
    participant SchemaRepo as Schema Cache
    participant Vault as AI Credential Vault
    participant LLM as User AI Model API (BYOK)
    participant Validator as sqlglot AST Validator
    participant DB as Customer PostgreSQL
    participant Audit as Audit Logger

    User->>API: POST /chat/query { prompt, connection_id }
    API->>SchemaRepo: get_active_schema(connection_id)
    SchemaRepo-->>API: Returns tables, columns, relations
    API->>Vault: get_decrypted_ai_key(user_id)
    Vault-->>API: Returns decrypted user API key & model
    
    API->>LLM: generate_content(Prompt + Schema Context, apiKey)
    LLM-->>API: Returns AIQueryResponse JSON
    
    rect rgb(255, 245, 245)
        Note over API,Validator: Multi-Pass AST Validation
        API->>Validator: validate_and_sanitize_sql(sql_query)
        Validator->>Validator: 1. len(sqlglot.parse(sql)) == 1 (Single statement)
        Validator->>Validator: 2. isinstance(tree, sqlglot.exp.Select) (Root is SELECT)
        Validator->>Validator: 3. No Insert/Update/Delete inside CTEs
        Validator->>Validator: 4. No Into, Create, Drop, Alter, Command
        Validator->>Validator: 5. No disallowed functions (pg_sleep, lo_export)
        Validator->>Validator: 6. Inject or clamp LIMIT 500
        Validator-->>API: Returns sanitized_sql
    end

    rect rgb(240, 255, 240)
        Note over API,DB: Bounded Read-Only Execution
        API->>DB: Open connection with statement_timeout=15000, default_transaction_read_only=on
        API->>DB: Execute sanitized_sql
        DB-->>API: Stream rows
        API->>API: Fetch up to 501 rows (detect truncation)
    end

    API->>Audit: record_query_event(user_id, prompt, sql, duration_ms, row_count)
    API-->>User: 200 OK (thought_process, sql, rows, columns, visualization)
```

---

## 4. Structured AI Output Contract

The interaction with Gemini enforces a strict Pydantic JSON schema:

```json
{
  "thought_process": "To find top 5 customers by revenue, join customers with orders, group by customer name, sum total_amount, order descending, limit 5.",
  "sql_query": "SELECT c.id, c.name, SUM(o.total_amount) AS total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY total_revenue DESC LIMIT 5;",
  "visualization": {
    "chart_type": "bar_chart",
    "title": "Top 5 Customers by Revenue",
    "x_axis_column": "name",
    "y_axis_columns": ["total_revenue"],
    "metric_label": null,
    "description": "Comparison of customer revenue"
  }
}
```

Supported visualization types:
- `table`: Standard tabular display.
- `bar_chart`: Categorical aggregations and comparisons.
- `line_chart`: Time-series trends and chronological metrics.
- `pie_chart`: Proportion and distribution breakdowns.
- `metric_card`: Single scalar values (e.g., total count, total revenue).

---

## 5. Security & Safety Rules

### 5.1 Multi-Pass AST Safety Invariants
1. **Single Statement Invariant:** Disallows semicolons that chain multiple statements (`SELECT 1; DROP TABLE users;`).
2. **Root Select Invariant:** The root expression of the AST must evaluate to `sqlglot.exp.Select`.
3. **Common Table Expression (CTE) Inspection:** PostgreSQL allows mutations inside CTEs (e.g., `WITH deleted AS (DELETE FROM orders RETURNING *) SELECT * FROM deleted;`). The validator walks all `With` nodes and forbids any `Insert`, `Update`, `Delete`, or `Merge` expressions.
4. **Clause Blacklist:** Blocks `SELECT ... INTO` (which creates tables), `COPY` (file system operations), and all transaction control statements (`COMMIT`, `ROLLBACK`).
5. **Function Blacklist:** Explicitly forbids dangerous PostgreSQL functions:
   - Time-delay / DoS: `pg_sleep`, `pg_sleep_for`, `pg_sleep_until`
   - File system access: `lo_export`, `lo_import`, `pg_read_file`, `pg_write_file`
   - Backend termination: `pg_terminate_backend`, `pg_cancel_backend`
   - System state modification: `set_config`
6. **Automatic LIMIT Clamping:** If the query lacks a `LIMIT` clause, `LIMIT 500` is automatically appended. If the query specifies `LIMIT > 500`, it is rewritten to `LIMIT 500`.

### 5.2 Native Database-Level Safeguards
- **Read-Only Session Mode:** Connections are opened with `default_transaction_read_only = on`. Any query attempting mutations is halted by PostgreSQL itself.
- **Statement Timeout:** Every query is executed under `SET statement_timeout = 15000;`. Any runaway Cartesian join or full table scan is terminated after 15 seconds with a graceful error.

---

## 6. Assumptions, Unresolved Decisions & Research Areas

### 6.1 Assumptions
- The LLM can generate valid PostgreSQL syntax when given accurate schema context.
- Single-statement `SELECT` queries are sufficient for all read-only analytics in MVP.

### 6.2 Unresolved Decisions
1. **Self-Correction Retry Loop:** If `sqlglot` rejects a query or PostgreSQL returns a syntax error, should the backend automatically re-prompt the LLM once with the error message for self-correction? *(Default: Return a clear error to the user in MVP; add single retry loop in Phase 2).*
2. **Query Result Caching:** Should identical natural-language questions reuse cached query results within a short time window (e.g., 60 seconds)? *(Default: No caching in MVP to ensure real-time query accuracy).*
3. **Rate Limiting:** How should prompt requests be throttled to prevent accidental token overconsumption? *(Default: Configurable local rate limit of 60 requests/minute).*

### 6.3 Areas for Further Research
- **Dynamic Few-Shot Prompting:** Dynamically selecting 2–3 relevant sample SQL queries based on user prompt embeddings to improve accuracy on complex schema queries.
- **Handling Schema Token Limits:** For enterprise databases with 500+ tables, developing a two-stage retrieval pipeline (Schema Retrieval Agent) to identify relevant tables before generating SQL.
