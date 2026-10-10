# Contributing to AskDB

Thank you for your interest in contributing to **AskDB**! We welcome contributions from the community to help build a developer-first, secure, and open-source AI database workspace.

---

## 1. Code of Conduct & Core Values

- **Security First:** We handle external database connections. Defense-in-depth, query sandboxing, and credential safety take precedence over all else.
- **Developer-Centric:** Simple setup, clean error messages, and well-typed contracts.
- **Modular Design:** Keep the core monolith modular and maintain clean boundaries between services.

---

## 2. Prerequisites

To run and contribute to this project locally, ensure you have:
- **Docker & Docker Compose** (v2.20+)
- **Python 3.12+**
- **Node.js 18.17+** (with npm or pnpm)
- **Git**

---

## 3. Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/askdb.git
   cd askdb
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Generate a secure Fernet key for `ENCRYPTION_MASTER_KEY`:
   ```bash
   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
   Add your Google Gemini API key to `GEMINI_API_KEY`.

3. **Start Local Databases:**
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
   This launches:
   - Application DB on `localhost:5432` (`ai_workspace_internal`)
   - Demo Customer DB on `localhost:5433` (`customer_demo_db`)

4. **Start the Backend API:**
   ```bash
   cd apps/api
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```

5. **Start the Web Frontend:**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` in your browser.

---

## 4. Development Workflow & Task Backlog

- We maintain a dependency-ordered backlog in [`docs/06-task-backlog.md`](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md).
- Before starting a new feature or fix, review [`docs/07-progress.md`](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/07-progress.md) to ensure prerequisites are satisfied.
- Never implement post-MVP features (write actions, local connector tunnels) before Vertical Slice 1 is verified.

---

## 5. Coding Standards & Tooling

### Python / Backend (`apps/api`)
- Format code with **Black** (`black .`)
- Lint code with **Ruff** (`ruff check .`)
- Type annotations are required on all function arguments and return types.
- Validate incoming and outgoing payloads with Pydantic v2 models.

### TypeScript / Frontend (`apps/web`)
- Enforce strict typing (`strict: true` in `tsconfig.json`).
- Format with **Prettier** (`npm run format`).
- Lint with **ESLint** (`npm run lint`).
- Use shadcn/ui components and Tailwind CSS utility classes. Avoid inline style tags.

---

## 6. Testing Expectations

All PRs must include relevant automated tests:
- **Unit Tests:** Fast, isolated tests for parsing, encryption, and utilities.
- **Integration Tests:** Use `pytest` with `testcontainers[postgres]` for real database interaction testing.
- **Security Tests:** Any change touching SQL parsing, query execution, or connection creation must include negative test cases verifying that malicious inputs are blocked.

Run the test suite:
```bash
# Backend tests
cd apps/api
pytest -v

# Frontend tests
cd apps/web
npm test
```

---

## 7. Submitting Pull Requests

1. Fork the repo and create your branch from `main`:
   `git checkout -b feature/TASK-XX-short-description`
2. Ensure all tests and linters pass locally.
3. Commit with concise, descriptive commit messages:
   `git commit -m "feat(sql-validator): add CTE AST mutation blocker"`
4. Push your branch and open a Pull Request.
5. In your PR description, reference the relevant task ID from `docs/06-task-backlog.md` and include test verification output.

---

## 8. Security Vulnerability Reporting

If you discover a security vulnerability in this project (especially related to SQL validation bypasses, SSRF, or credential handling), please **do not open a public issue**. Instead, report it privately to `security@yourdomain.com` or via GitHub Security Advisories.
