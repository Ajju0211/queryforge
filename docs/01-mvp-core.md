# AI Database Workspace - Minimum Viable Product (MVP)

The MVP focuses on delivering immediate value by allowing users to connect a database, ask questions, and get a generated admin interface safely and reliably. 

## 🎯 Core Objective
A user can connect a PostgreSQL database, ask a meaningful question, see the correct answer, and use a generated admin panel safely without writing any frontend code.

## 📦 Scope of MVP Features

| Feature Category | MVP Implementation |
| :--- | :--- |
| **Database Support** | PostgreSQL only. |
| **Connections** | Hosted connection first (connect directly to a reachable customer database over TLS). |
| **Schema Discovery** | Automatic extraction of tables, columns, primary keys, and foreign-key relationships. |
| **AI Chat (Read-Only)** | Natural-language questions converted into validated, bounded read queries. |
| **Results & Visualization** | Data tables, summaries, and a few common chart types (bar, line, pie). |
| **Generated Admin** | Auto-generated table pages, record detail views, search functionality, and filters based on schema metadata. |
| **Accounts & Auth** | Basic authentication, basic workspace ownership. |
| **Export** | CSV export with access controls. |
| **Model Selection** | One default model initially (e.g., Gemini 1.5 Pro). |

## 🏗️ Architecture & Dependencies (Modular Monolith)
- **Frontend:** Next.js (React), Tailwind CSS.
- **Backend:** FastAPI, Python 3.12+.
- **Database Layer (Internal & External):** SQLAlchemy 2.0 (async), `asyncpg` (for PostgreSQL).
- **Internal DB Migrations:** Alembic.
- **SQL Validation:** `sqlglot` (to parse and verify the AST contains only `SELECT` operations).
- **Security:** `cryptography` (Fernet) for encrypting user database credentials at rest.
- **Internal DB:** A separate PostgreSQL database for the application's own state (users, workspaces, metadata), completely isolated from customer databases.

## 🛑 What is Explicitly Excluded from MVP
- Modifying database records (Write actions)
- Local database connectors (Docker agents)
- Support for MySQL, SQL Server, etc.
- Complex enterprise SSO or granular RBAC
- Scheduled AI reports

## ⚠️ Architectural & Security Risks
1. **Malicious or Destructive SQL Generation:** The LLM might generate `DROP TABLE`, `UPDATE`, or `DELETE` statements.
   - **Mitigation 1 (Application Level):** Parse the generated SQL using `sqlglot.parse()`. Iterate through the returned expressions and verify `isinstance(expr, sqlglot.exp.Select)` for all statements before execution.
   - **Mitigation 2 (Database Level):** Execute all queries using SQLAlchemy with `session.execution_options(postgresql_readonly=True)` to enforce read-only transactions natively.
2. **Credential Theft:** Storing user database connection strings in plaintext is a severe risk.
   - **Mitigation:** Use symmetric encryption (e.g., Fernet) to encrypt connection strings at rest in the internal DB. Inject the decryption key via environment variables.
3. **Runaway Queries:** AI-generated queries might lack `LIMIT` clauses or do massive table scans, crashing the customer's database or timing out.
   - **Mitigation:** Enforce a strict statement timeout (e.g., 15 seconds) on the Postgres connection (`SET statement_timeout = 15000;`).
4. **Data Privacy (Prompt Injection):** Sending the entire database schema to the LLM might exceed token limits or expose sensitive column names unnecessarily.
   - **Mitigation:** Allow users to explicitly exclude tables/columns during the connection phase before metadata is sent to the LLM.

## 🧪 Testing & Deployment Strategy
- **Testing:** 
  - `pytest` for backend tests. 
  - Use `Testcontainers-python` to spin up ephemeral PostgreSQL instances to test schema introspection, SQL generation validity, and query execution without mocking the database.
- **Deployment:** Dockerized Next.js and FastAPI containers. Hosted internal PostgreSQL database.

## ✅ Acceptance Criteria
1. User can sign up and create a workspace.
2. User can provide a PostgreSQL connection URI, which is encrypted and saved.
3. The system connects to the provided database, extracts schema, and saves metadata to the internal DB.
4. The generated admin panel successfully renders a data table for at least one table in the connected database.
5. User can ask "Show me the top 5 records from [table]" and receive a valid data table response.
6. The system blocks any prompt attempting to execute an `UPDATE`, `DELETE`, or `DROP` statement, returning a safe error message.
7. Any executed query over 15 seconds times out gracefully.

## 🛠️ Implementation Plan & Milestones
- **Milestone 1: Foundation & Secure Connection**
  - Setup FastAPI + Next.js repositories.
  - Implement basic Auth & internal Postgres DB with Alembic.
  - Implement secure credential storage (Fernet encryption).
  - Create the `POST /connect` endpoint to test connection to a target Postgres DB.
- **Milestone 2: Schema Discovery Engine**
  - Implement SQLAlchemy reflection to extract tables, columns, types, and foreign keys.
  - Store schema metadata in the internal DB.
  - Build API endpoints to serve schema metadata to the frontend.
- **Milestone 3: AI Query & Execution Pipeline**
  - Integrate LLM provider (Gemini).
  - Build the prompt pipeline injecting schema context.
  - Implement `sqlglot` AST parsing to validate `SELECT` only.
  - Execute queries using `postgresql_readonly=True` and format results as JSON.
- **Milestone 4: Generated Admin UI & Visualization**
  - Build dynamic Next.js data tables consuming the schema metadata API.
  - Implement the chat interface.
  - Render charts based on LLM structured output.

## ❓ Unresolved Decisions (Must be settled before coding)
1. **Frontend UI Framework:** Should we use Shadcn/UI, Material UI, or Tremor for the generated admin panel and charts?
2. **Schema Metadata Format:** Exactly how should the backend pass the schema graph to the frontend so it easily translates to React components?
3. **LLM Structured Output Format:** What JSON schema should the LLM return for its tool calls (e.g., query vs. chart generation)?
