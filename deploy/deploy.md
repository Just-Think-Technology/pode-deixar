# Deploy

> Stack files: `deploy/docker-compose.yml` + `deploy/docker-compose.dev.yml` (local,
> `.env.dev`), `deploy/docker-compose.staging.yml` / `deploy/docker-compose.production.yml`
> (deploy), `deploy/Caddyfile.docker` / `deploy/Caddyfile.production`, `.env.example` (single
> template — real `.env.staging` / `.env.production` files are never committed
> to git). Each deploy file has its own `name`, so commands do not require
> `-p` or `--env-file`.

## Commands

| Environment                        | Command                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Local (images, local Postgres)     | `docker compose up -d --build`                                         |
| Local (hot-reload, local Postgres) | `docker compose -f deploy/docker-compose.dev.yml up -d --build`        |
| Staging (VPS, hot-reload)          | `docker compose -f deploy/docker-compose.staging.yml up -d --build`    |
| Production (VPS, images)           | `docker compose -f deploy/docker-compose.production.yml up -d --build` |

### Stack Scripts

**Start a stack:**

```bash
scripts/stack-up [dev|staging|production]
```

Runs `up -d --build` using the corresponding compose file and prints a summary
of where each service is running (frontend, API, services, Mailpit, SeaweedFS S3,
Postgres).

With `STACK_UP_DRY_RUN=1`, it only prints the addresses without starting the
stack.

**Stop a stack:**

```bash
scripts/stack-down [dev|staging|production]
```

Runs `docker compose down` using the corresponding compose file.

The stack-down script does not remove volumes by default, preventing persistent
data such as databases and SeaweedFS storage from being deleted. Use
`docker compose down -v` manually when volume removal is explicitly required.

The plain `docker compose up` command does not print the post-start summary
(the Compose CLI has no post-start hook), which is why the stack-up shortcut
exists.

## Local

* Everything runs locally: dedicated Postgres (host `localhost:15432`, between
  containers `postgres:5432`), local SeaweedFS S3 (`seaweedfs`), Redis, Mailpit,
  Caddy, and daily local database backups.
* Development configuration comes from `.env.dev` (versioned: localhost-only
  and disposable values); each service `DATABASE_URL` uses its
  least-privilege role (dev passwords default in compose), while
  `DIRECT_DATABASE_URL` stays privileged for migrations.
* `auth` runs `prisma migrate deploy` on startup against the local database.
* Fresh volumes seed the roles automatically (`init-roles.sh`); existing
  volumes need one manual `backend/scripts/apply-db-roles.sh` run against
  the local Postgres (or `docker compose down -v` for a clean slate).
* Mailpit (`:8025`) is local-only. `dist` directories for the `shared` packages
  are generated inside the container (`prestart:dev` + `watch:*` scripts for
  each service). Never mount the host's `dist` directory, as the volume would
  overwrite the container build and cause the service to fail with
  `MODULE_NOT_FOUND`.

## Deploy

* Staging runs in hot-reload mode (the same services as production, with source
  code mounted and `start:dev`); production runs compiled images. Staging
  volume lists must remain mirrored with `deploy/docker-compose.dev.yml`.
* `auth` runs `prisma migrate deploy` on startup against the Neon database for
  each environment; never run destructive operations manually against staging
  or production.
* One-off step when adopting this setup: seed the least-privilege service
  roles on each Neon database BEFORE starting the stack — from a machine with
  the owner URL, run `backend/scripts/apply-db-roles.sh` with `DATABASE_URL`
  set to the privileged owner URL, `DB_MIGRATOR` to the Neon owner role, and
  the five `DB_ROLE_*_PASSWORD` secrets (same values embedded in the
  `DB_*_URL` entries below). Re-run after any migration that adds tables.
* One-off step when adopting this setup: add per-service `DB_*_URL` entries
  (role credentials + `?sslmode=require`) alongside the matching
  `DB_ROLE_*_PASSWORD` values to the real `.env.staging` /
  `.env.production` files (secrets in GitHub Environments, never in git).
  `DIRECT_DATABASE_URL` stays privileged (migrations + backup only).
* One-off step when adopting this setup: add `STORAGE_ACCESS_KEY` /
  `STORAGE_SECRET_KEY` (fallback `MINIO_ACCESS_KEY` /
  `MINIO_SECRET_KEY`) to the real `.env.staging` / `.env.production` files.
  SeaweedFS S3 reads `STORAGE_*`, and the deploy files no longer
  interpolate `MINIO_ROOT_*`.

## Rules

* One Compose file per environment (`staging` / `production`); staging
  includes the production file and only swaps the environment configuration.
* No published ports except Caddy 80/443; no local Postgres, frontend, or
  Mailpit in the deploy files.
* One Redis instance per stack; `auth` runs `prisma migrate deploy` on startup.
* Renaming a stack `name` orphans its volumes. Migrating SeaweedFS data requires a
  manual volume copy (`seaweedfs_data`) before dropping the old volumes.
* Secrets live in GitHub Environments (`staging` / `production`), never in git.
  Agents must never open the real `.env.staging` / `.env.production` files.
