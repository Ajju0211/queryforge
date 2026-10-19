# AI Database Workspace - Minimum Viable Product (MVP)

The MVP focuses on delivering immediate value by allowing users to connect a database, ask questions, and get a generated admin interface safely and reliably. 

## 🎯 Core Objective
A user can connect a PostgreSQL database, ask a meaningful question, see the correct answer, and use a generated admin panel safely without writing any frontend code.

## 📦 Scope of MVP Features

| Feature Category | MVP Implementation |
| :--- | :--- |
| **Database Support** | PostgreSQL only. |
| **Connections** | Local & remote connections (connect directly to local databases on localhost/Docker/LAN, or remote cloud databases over TLS). |
| **Schema Discovery** | Automatic extraction of tables, columns, primary keys, and foreign-key relationships. |
| **AI Chat (Read-Only)** | Natural-language questions converted into validated, bounded read queries. |
| **Results & Visualization** | Data tables, summaries, and a few common chart types (bar, line, pie). |
| **Generated Admin** | Auto-generated table pages, record detail views, search functionality, and filters based on schema metadata. |
| **Accounts & Auth** | Basic authentication, basic workspace ownership. |
| **Export** | CSV export with access controls. |
| **AI Model API (BYOK)** | Bring-Your-Own-Key (BYOK): Users can configure their own AI model API key and select their model (e.g., Google Gemini, OpenAI) in workspace settings. The system securely encrypts the key at rest and uses it to execute natural-language queries. |

## 🏗️ Architecture & Dependencies (Modular Monolith)
- **Frontend:** Next.js (React), Tailwind CSS.
- **Backend:** FastAPI, Python 3.12+.
- **Database Layer (Internal & External):** SQLAlchemy 2.0 (async), `asyncpg` (for PostgreSQL).
- **Internal DB Migrations:** Alembic.
- **SQL Validation:** `sqlglot` (to parse and verify the AST contains only `SELECT` operations).
- **Security:** `cryptography` (Fernet) for encrypting user database credentials and user AI model API keys at rest.
- **AI Client Layer:** Dynamic LLM adapter supporting user-supplied API keys (e.g., `google-genai` for Gemini, OpenAI-compatible APIs) instantiated per workspace/session.
- **Internal DB:** A separate PostgreSQL database for the application's own state (users, workspaces, settings, encrypted keys, metadata), completely isolated from customer databases.

## 🛑 What is Explicitly Excluded from MVP
- Modifying database records (Write actions)
- Support for non-Postgres databases (MySQL, SQL Server, etc.)
- Complex enterprise SSO or granular RBAC
- Scheduled AI reports

## ⚠️ Architectural & Security Risks
1. **Malicious or Destructive SQL Generation:** The LLM might generate `DROP TABLE`, `UPDATE`, or `DELETE` statements.
   - **Mitigation 1 (Application Level):** Parse the generated SQL using `sqlglot.parse()`. Iterate through the returned expressions and verify `isinstance(expr, sqlglot.exp.Select)` for all statements before execution.
   - **Mitigation 2 (Database Level):** Execute all queries using SQLAlchemy with `session.execution_options(postgresql_readonly=True)` to enforce read-only transactions natively.
2. **Credential Theft:** Storing user database connection strings and user AI model API keys in plaintext is a severe risk.
   - **Mitigation:** Use symmetric encryption (e.g., Fernet) to encrypt both database credentials and user AI model API keys at rest in the internal DB. Inject the decryption key via environment variables. Never return raw keys in API responses or logs.
3. **Runaway Queries:** AI-generated queries might lack `LIMIT` clauses or do massive table scans, crashing the customer's database or timing out.
   - **Mitigation:** Enforce a strict statement timeout (e.g., 15 seconds) on the Postgres connection (`SET statement_timeout = 15000;`).
4. **Data Privacy (Prompt Injection):** Sending the entire database schema to the LLM might exceed token limits or expose sensitive column names unnecessarily.
   - **Mitigation:** Allow users to explicitly exclude tables/columns during the connection phase before metadata is sent to the LLM.
5. **Invalid or Compromised User AI API Keys:** User-provided keys may be invalid, exhausted, or leaked if mishandled.
   - **Mitigation:** Validate the AI model API key with a lightweight verification ping upon entry. Keep keys strictly server-side; the frontend receives only masked previews (e.g., `sk-...4a1b`).

## 🧪 Testing & Deployment Strategy
- **Testing:** 
  - `pytest` for backend tests. 
  - Use `Testcontainers-python` to spin up ephemeral PostgreSQL instances to test schema introspection, SQL generation validity, and query execution without mocking the database.
  - Mock third-party AI provider API calls in automated test suites.
- **Deployment:** Dockerized Next.js and FastAPI containers. Hosted internal PostgreSQL database.

## ✅ Acceptance Criteria
1. User can sign up and create a workspace.
2. User can add and update their AI model API key (e.g., Gemini / OpenAI) and select their preferred model; the key is validated, encrypted, and saved.
3. User can provide a PostgreSQL connection URI, which is encrypted and saved.
4. The system connects to the provided database, extracts schema, and saves metadata to the internal DB.
5. The generated admin panel successfully renders a data table for at least one table in the connected database.
6. User can ask "Show me the top 5 records from [table]" and receive a valid data table response generated using their configured AI model API.
7. The system blocks any prompt attempting to execute an `UPDATE`, `DELETE`, or `DROP` statement, returning a safe error message.
8. Any executed query over 15 seconds times out gracefully.

## 🛠️ Implementation Plan & Milestones
- **Milestone 1: Foundation, Secure Connection & AI Settings**
  - Setup FastAPI + Next.js repositories.
  - Implement basic Auth & internal Postgres DB with Alembic.
  - Implement secure credential storage (Fernet encryption for database passwords and user AI model API keys).
  - Create settings API endpoints to configure, test, and save the user's AI model API key.
  - Create the `POST /connect` endpoint to test connection to a target Postgres DB.
- **Milestone 2: Schema Discovery Engine**
  - Implement SQLAlchemy reflection to extract tables, columns, types, and foreign keys.
  - Store schema metadata in the internal DB.
  - Build API endpoints to serve schema metadata to the frontend.
- **Milestone 3: AI Query & Execution Pipeline**
  - Build dynamic LLM provider client initialized with the user/workspace's configured AI model API key.
  - Build the prompt pipeline injecting schema context.
  - Implement `sqlglot` AST parsing to validate `SELECT` only.
  - Execute queries using `postgresql_readonly=True` and format results as JSON.
- **Milestone 4: Generated Admin UI & Visualization**
  - Build dynamic Next.js data tables consuming the schema metadata API.
  - Implement the chat interface and AI settings configuration UI.
  - Render charts based on LLM structured output.

## ❓ Unresolved Decisions (Must be settled before coding)
1. **Frontend UI Framework:** Should we use Shadcn/UI, Material UI, or Tremor for the generated admin panel and charts?
2. **Schema Metadata Format:** Exactly how should the backend pass the schema graph to the frontend so it easily translates to React components?
3. **Supported AI Providers in MVP:** Initial UI options for user AI model API keys (e.g., Google Gemini and OpenAI / OpenAI-compatible; optional fallback to server default `.env` key if not set by user).
