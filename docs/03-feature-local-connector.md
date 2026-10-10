# Feature Specification: Local Database Connector (Post-MVP)

> **Implementation Status:** ⏸️ **Post-MVP (Phase 2/3 Expansion)**  
> **MVP Scope:** Direct connection to reachable PostgreSQL databases over TLS. This document specifies the design, security protocols, and integration points for an outbound-only local connector agent without complicating the initial MVP.

---

## 1. Feature Objective

Enable developers and enterprise teams to connect databases running on `localhost`, inside private VPCs, or behind corporate firewalls to the AI Database Workspace without opening inbound firewall ports, configuring complex VPNs, or sending raw database credentials across the internet.

---

## 2. Dependencies on MVP Infrastructure

The Local Database Connector integrates cleanly because of abstractions established in the MVP:

1. **Pluggable Query Executor (`QueryExecutor` Protocol):** The backend database query pipeline is decoupled from the network transport mechanism (see [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md)).
2. **Schema Metadata Contract:** The JSON schema contract defined in the MVP is transported over the tunnel from the agent without modification (see [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md)).
3. **Workspace Token Management:** The internal application database provides workspace-scoped authentication tokens and audit logging.

---

## 3. Architecture & Data Flow

```
[Customer Infrastructure / Localhost]           [Hosted / Self-Hosted Backend]
┌──────────────────────────────────────┐        ┌───────────────────────────────┐
│ Local PostgreSQL Database            │        │ FastAPI Backend               │
│ (e.g. postgres:5432, 10.0.1.5)       │        │ (Tunnel Gateway Endpoint)     │
└──────────────────┬───────────────────┘        └───────────────▲───────────────┘
                   │                                            │
                   ▼ (Local loopback / LAN)                     │ Outbound WSS / gRPC
┌──────────────────────────────────────┐                        │ (TLS 1.3 encrypted)
│ Local Connector Agent                │                        │
│ (Lightweight Go or Rust Binary /     ├────────────────────────┘
│  Docker Container)                   │
│                                      │
│  - Stores DB Credentials locally     │
│  - Enforces local query validation   │
│  - Executes queries against DB       │
│  - Streams results up tunnel         │
└──────────────────────────────────────┘
```

### Communication Lifecycle
1. **Agent Initiation:** The user starts the connector locally:
   ```bash
   docker run -e AGENT_TOKEN=ag_conn_xyz123 \
              -e TARGET_DB_URL="postgresql://user:pass@localhost:5432/my_db" \
              ghcr.io/ai-database-workspace/connector:latest
   ```
2. **Outbound Handshake:** The agent initiates an outbound WebSocket (WSS) or gRPC connection to `wss://api.yourdomain.com/api/v1/tunnel`. No inbound firewall ports are opened on the customer side.
3. **Local Schema Discovery:** Upon connecting, the agent performs local schema introspection and streams the structured schema JSON up to the backend to populate the workspace.
4. **Query Routing:** When a user asks a question in the web UI, the backend generates and validates the SQL query, then routes a `QueryTask` packet down the active tunnel.
5. **Local Execution & Streaming:** The agent executes the read-only query against the local database and streams bounded row batches back to the backend.

---

## 4. Security & Privacy Guarantees

### 4.1 Zero Credential Transmission
Customer database credentials (`username`, `password`, `connection string`) live strictly on the local machine/VPC where the agent runs. They are **never transmitted** to the backend, stored in the application database, or exposed to the browser.

### 4.2 Workspace Scoped Agent Tokens
- Agents authenticate using high-entropy tokens (`ag_conn_...`) generated in the web UI.
- Tokens are bound to a specific workspace and can be revoked instantly by administrators from the connection settings dashboard.

### 4.3 Defense-in-Depth Agent-Side Validation
Even though the backend validates queries via `sqlglot`, the local agent runs an independent secondary validation check on incoming query packets before execution, refusing to run non-`SELECT` statements or unsafe utility commands.

### 4.4 Encrypted Outbound Transport
All tunnel traffic is protected by TLS 1.3 with strict server certificate verification and support for mutual TLS (mTLS) for enterprise deployments.

---

## 5. Architectural Compatibility with MVP

To prevent the local connector from complicating the MVP:
1. **The Backend `QueryExecutor` Protocol:**
   ```python
   class QueryExecutor(Protocol):
       async def execute(self, connection: ConnectionRecord, sql: str) -> QueryResult:
           ...
   ```
   - In MVP: `DirectPostgresExecutor` connects directly over TLS via SQLAlchemy/asyncpg.
   - In Phase 2/3: `TunnelQueryExecutor` checks if the connection type is `local_agent` and routes through the agent tunnel manager.
2. **Frontend Transparency:**
   The Next.js frontend, AI chat interface, and schema-driven admin panel interact only with backend REST/WebSocket endpoints. The frontend is completely agnostic to whether a connection is direct or agent-tunneled.

---

## 6. Phase 2/3 Acceptance Criteria

1. User can generate a local connection token in the workspace settings.
2. Running the connector Docker container or binary connects to the backend gateway over an outbound TLS tunnel.
3. The connector discovers local database schema and registers it in the workspace without sending credentials to the server.
4. Questions submitted in the web UI are executed by the local connector and return results to the UI.
5. Revoking the connection token in the web UI immediately drops the tunnel and prevents further queries.
6. Local agent refuses to execute commands if a write operation or unsafe function is received down the tunnel.

---

## 7. Confirmed Decisions vs. Open Questions

### Confirmed Decisions
- [x] Post-MVP feature (Phase 2/3); MVP uses direct TLS connections.
- [x] Outbound-only tunnel architecture (no open customer ports).
- [x] Database credentials remain 100% local to the agent.
- [x] Decoupled in backend via `QueryExecutor` protocol.

### Open Questions (To be resolved prior to Phase 2/3)
1. **Agent Implementation Language:** Should the lightweight agent be written in Go (minimal memory footprint, single static binary) or Python (code reuse with backend `sqlglot` validator)? *(Recommendation: Go binary with embedded SQL AST parser for minimal distribution size and resource consumption).*
2. **Transport Protocol:** WebSockets vs. HTTP/2 gRPC streams. *(Recommendation: WebSockets for maximum proxy and firewall compatibility).*

---

## 8. Related Documentation
- [01-mvp-core.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/01-mvp-core.md) - MVP Core Specification & Read-Only Engine.
- [05-architecture-and-data-flow.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/05-architecture-and-data-flow.md) - Core architecture and `QueryExecutor` abstraction.
- [06-task-backlog.md](file:///Users/ajaysingh/Documents/Open-source/ai-database-workspace/docs/06-task-backlog.md) - Task roadmap and milestones.
