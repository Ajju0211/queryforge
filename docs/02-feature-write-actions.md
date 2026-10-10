# Feature Expansion: Confirmed Write Actions

Once the read-only MVP is stable, the next major feature is allowing users to safely modify their database using natural language. 

## 🎯 Goal
Enable users to ask for database updates, deletions, or inserts in natural language, while strictly preventing AI-hallucinated destructive operations.

## 🔄 The Safe Execution Workflow
Never allow an unrestricted natural-language request to execute arbitrary `UPDATE`, `DELETE`, `DDL`, or other privileged statements directly. Use this strict 6-step flow:

1. **Interpret Request:** The AI model parses the user's natural language request (e.g., "Change the status of order #1234 to Shipped").
2. **Identify Impact:** The backend identifies the specific affected records and the exact SQL changes proposed.
3. **Display Preview:** The UI shows the user exactly what will happen (e.g., "This will update 1 row in the `orders` table. Old status: Pending -> New Status: Shipped").
4. **Explicit Confirmation:** The user must click a "Confirm & Execute" button. 
5. **Validation & Execution:** The backend re-validates the user's permissions, ensures the query is bounded, and executes it within a database transaction.
6. **Audit Logging:** The action, the user who triggered it, the original prompt, and the executed SQL are recorded in a permanent audit log.

## 🛡️ Security Measures
- **No Direct AI Control:** The AI only *proposes* JSON tool calls or structured updates to the backend. The backend constructs the final SQL.
- **Transactions:** Wrap operations in transactions so they can be rolled back if they fail validation mid-execution.
- **Row-Level Security (RLS):** If the customer's Postgres database has RLS configured, pass the current user's identity to the database session to enforce it natively.
- **Generated Admin Updates:** Enable "Edit" buttons on the generated admin detail pages, backed by the same permission and audit layer.
