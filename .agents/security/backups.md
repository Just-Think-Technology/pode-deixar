# Backups and Restore

- **What:** daily `pg_dump` (gzip) of the Neon database, 7-day retention
- **Where:** `db-backup` service in `deploy/docker-compose.staging.yml` /
  `deploy/docker-compose.production.yml` (same stack via include)
  (PostgreSQL 16 image as dump client + cron schedule via env)
- **Restore test:** restore into a temporary database, validate table/row
  counts, then drop it — run after any backup pipeline change
- **Retention:** `BACKUP_RETENTION_DAYS=7`, persisted `backup_data` volume
- **Failure must be loud:** `pg_dump` writes to `….sql` and `gzip` runs
  afterwards. In a pipeline (`pg_dump … | gzip > file`) the exit status is
  `gzip`'s, so a failed dump leaves an empty `.sql.gz` while the script still
  prints "Backup concluído" and the retention loop deletes the last good copy.
  On failure the script removes the partial file and exits non-zero
- **Dump source:** `DATABASE_URL` is pinned in the `db-backup` service to
  `${DIRECT_DATABASE_URL:?…}` — the privileged URL reserved for migrations and
  backups (see [Database](../decisions/database.md)). Per-service
  `DB_<SERVICE>_URL` is read-only and would not cover every table
