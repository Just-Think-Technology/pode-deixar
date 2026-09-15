# Deploy

> Stack files: `docker-compose.yml` + `docker-compose.dev.yml` (local,
> `.env.dev`), `docker-compose.staging.yml` / `docker-compose.production.yml`
> (deploy), `Caddyfile.docker` / `Caddyfile.production`, `.env.example` (single
> template — real `.env.staging` / `.env.production` files are never committed
> to git). Each deploy file has its own `name`, so commands do not require
> `-p` or `--env-file`.

## Commands

| Environment                        | Command                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| Local (images, local Postgres)     | `docker compose up -d --build`                                  |
| Local (hot-reload, local Postgres) | `docker compose -f docker-compose.dev.yml up -d --build`        |
| Staging (VPS, hot-reload)          | `docker compose -f docker-compose.staging.yml up -d --build`    |
| Production (VPS, images)           | `docker compose -f docker-compose.production.yml up -d --build` |

### Stack Scripts

**Start a stack:**

```bash
scripts/stack-up [dev|staging|production]
```

Runs `up -d --build` using the corresponding compose file and prints a summary
of where each service is running (frontend, API, services, Mailpit, MinIO,
Postgres).

With `STACK_UP_DRY_RUN=1`, it only prints the addresses without starting the
stack.

**Stop a stack:**

```bash
scripts/stack-down [dev|staging|production]
```

Runs `docker compose down` using the corresponding compose file.

The stack-down script does not remove volumes by default, preventing persistent
data such as databases and MinIO storage from being deleted. Use
`docker compose down -v` manually when volume removal is explicitly required.

The plain `docker compose up` command does not print the post-start summary
(the Compose CLI has no post-start hook), which is why the stack-up shortcut
exists.

## Local

* Everything runs locally: dedicated Postgres (host `localhost:15432`, between
  containers `postgres:5432`), local MinIO (`minioadmin`), Redis, Mailpit,
  Caddy, and daily local database backups.
* Development configuration comes from `.env.dev` (versioned: localhost-only
  and disposable values); `DATABASE_URL` is configured to use the local
  Postgres instance.
* `auth` runs `prisma migrate deploy` on startup against the local database.
* Mailpit (`:8025`) is local-only. `dist` directories for the `shared` packages
  are generated inside the container (`prestart:dev` + `watch:*` scripts for
  each service). Never mount the host's `dist` directory, as the volume would
  overwrite the container build and cause the service to fail with
  `MODULE_NOT_FOUND`.

## Deploy

* Staging runs in hot-reload mode (the same services as production, with source
  code mounted and `start:dev`); production runs compiled images. Staging
  volume lists must remain mirrored with `docker-compose.dev.yml`.
* `auth` runs `prisma migrate deploy` on startup against the Neon database for
  each environment; never run destructive operations manually against staging
  or production.
* One-off step when adopting this setup: add `MINIO_ROOT_USER` /
  `MINIO_ROOT_PASSWORD` (mirroring `MINIO_ACCESS_KEY` /
  `MINIO_SECRET_KEY`) to the real `.env.staging` / `.env.production` files.
  The MinIO server only reads `MINIO_ROOT_*`, and the deploy files no longer
  interpolate these variables.

## Rules

* One Compose file per environment (`staging` / `production`); staging
  includes the production file and only swaps the environment configuration.
* No published ports except Caddy 80/443; no local Postgres, frontend, or
  Mailpit in the deploy files.
* One Redis instance per stack; `auth` runs `prisma migrate deploy` on startup.
* Renaming a stack `name` orphans its volumes. Migrating MinIO data requires a
  manual volume copy (see chat/PR history) before dropping the old volumes.
* Secrets live in GitHub Environments (`staging` / `production`), never in git.
  Agents must never open the real `.env.staging` / `.env.production` files.
