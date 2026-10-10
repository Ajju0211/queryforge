# Future Roadmap: Beyond the Core

Once the MVP, Write Actions, and Local Connectors are built and validated, the product can expand into an enterprise-grade AI database platform.

## 🚀 Future Feature Pipeline

### 1. Multi-Database Support
- **Next targets:** MySQL, SQLite, and Microsoft SQL Server.
- **Implementation:** Because the core uses SQLAlchemy, adding new dialects is manageable, though schema introspection nuances will require specific adapters.

### 2. Autonomous Background Reporting
- **Scheduled AI Reports:** "Every Monday at 9 AM, send a Slack message summarizing revenue churn for the past week."
- **Alerting:** "Notify me if the number of error logs exceeds 100 in an hour."
- **Infrastructure:** Requires adding Redis and background workers (e.g., Celery or RQ) to handle long-running, scheduled cron jobs.

### 3. Advanced Customization & Dashboards
- Allow users to pin specific charts generated from chat into persistent, shareable Dashboards.
- Support arbitrary UI component generation for highly specific edge cases, overriding the standard generated admin table.

### 4. Enterprise Readiness
- **Complex RBAC:** Granular roles (e.g., "Marketing can view Customers but not Payments").
- **SSO / SAML:** Integration with Okta, Google Workspace, Azure AD.

### 5. Community & Marketplace
- Allow users to share specific admin layouts or prompt templates publicly.
- Build a marketplace of common internal tool configurations.
