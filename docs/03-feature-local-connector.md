# Feature Expansion: Local Database Connector

To capture developers and businesses with private networks or localhost databases, the product needs a secure way to connect without exposing database ports to the public internet.

## 🎯 Goal
Allow users to query and manage databases sitting behind firewalls or running locally (e.g., inside a Docker compose stack) via an outbound-only agent.

## 🏗️ Architecture
1. **The Agent:** A lightweight CLI or Docker container that the user runs on their infrastructure.
2. **Outbound Connection:** The agent establishes a secure WebSockets or gRPC tunnel *out* to your hosted FastAPI backend.
3. **Request Routing:** When a user asks a question in the hosted web UI, the backend sends the query down the tunnel to the agent.
4. **Local Execution:** The agent executes the query against the local database and returns the results up the tunnel.

## 🔒 Security & Best Practices
- **No Inbound Ports:** The user does not need to open any firewall ports.
- **Credential Safety:** Database credentials (username/password) live *only* on the local agent. They are never sent to your hosted backend. 
- **Restricted Operations:** The agent enforces a strict whitelist of allowed operations.
- **Short-lived Sessions:** Use temporary, authenticated session tokens for the agent to connect to the backend.

## 📦 Distribution
- Package the local connector as an easy-to-run Docker image: 
  `docker run -e AGENT_TOKEN=xxx your-registry/local-connector`
- Provide a simple binary for Mac/Linux/Windows for non-Docker users.
