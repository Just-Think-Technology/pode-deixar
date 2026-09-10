# Backups and Restore

- **What:** daily `pg_dump` (gzip) of the Neon database, 7-day retention
- **Where:** `db-backup` service in `docker-compose.staging.yml` /
  `docker-compose.production.yml` (same stack via include)
  (PostgreSQL 16 image as dump client + cron schedule via env)
- **Restore test:** restore into a temporary database, validate table/row
  counts, then drop it — run after any backup pipeline change
- **Retention:** `BACKUP_RETENTION_DAYS=7`, persisted `backup_data` volume
