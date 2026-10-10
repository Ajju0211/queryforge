# infra - Local Infrastructure & Services

## Overview
This directory contains infrastructure configurations for running **AskDB** locally using Docker Compose.

## Services
1. **`app-postgres` (Port 5432):**
   - Internal PostgreSQL 16 database storing application users, workspaces, connection credentials, cached schema metadata, and audit logs.
   - Database name: `ai_workspace_internal`
   - User: `postgres`, Password: `postgrespassword`
2. **`customer-demo-postgres` (Port 5433):**
   - Seeded demo customer database used for testing connections, schema introspection, and natural-language query execution.
   - Database name: `customer_demo_db`
   - User: `postgres`, Password: `demopassword`
   - Pre-seeded tables: `customers`, `orders`, `order_items` (initialized via `seed/demo_customer.sql`).

## Starting Services
```bash
docker compose up -d
```

## Stopping Services
```bash
docker compose down
```
To purge database volumes and reset sample data:
```bash
docker compose down -v
```
