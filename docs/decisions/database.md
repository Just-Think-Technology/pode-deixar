# Database

- **Least-privilege role:** the app connects as `pode_deixar_app`
  (not a superuser)
- **Grants:** `SELECT, INSERT, UPDATE, DELETE` on tables, `USAGE` on sequences;
  `REVOKE CREATE` on schema and database; default privileges cover future
  tables/sequences
- **Migrations** run with a privileged URL at deploy time
  (`pnpm prisma:migrate`), never with the app role
