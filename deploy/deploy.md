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
  volume lists must remain mirrored with `deploy/docker-compose.dev.yml`.
* `auth` runs `prisma migrate deploy` on startup against the Neon database for
  each environment; never run destructive operations manually against staging
  or production.
* One-off step when adopting this setup: add `STORAGE_ACCESS_KEY` /
  `STORAGE_SECRET_KEY` (fallback `MINIO_ACCESS_KEY` /
  `MINIO_SECRET_KEY`) to the real `.env.staging` / `.env.production` files.
  SeaweedFS S3 reads `STORAGE_*`, and the deploy files no longer
  interpolate `MINIO_ROOT_*`.

## Observability (fatia 1 — métricas)

* `deploy/observability/` holds `prometheus.yml` (5 scrape jobs + self +
  node-exporter), `rules.yml` (`ServiceDown`, `High5xxRate`, `HighP95Latency`,
  `DiskFull`) and Grafana provisioning + RED dashboard. Config in git, secrets
  never in git.
* `/metrics` on every service is internal-only: no Caddy route, no published
  port, plus a bearer guard (`MetricsGuard`, fail-closed). Prometheus scrapes
  over the compose network with the token from a host file (see one-off step).
* Prometheus/Grafana UIs bind host loopback only (`127.0.0.1:9090` /
  `127.0.0.1:3000`, dev Grafana on `:3100` because the dev frontend owns
  `:3000`) — reach them via SSH tunnel, e.g.
  `ssh -L 3000:127.0.0.1:3000 <vps>`. Retention is 15 days (`--storage.tsdb.retention.time`).
* Alert rules are dashboard-only by decision (firing state visible in the
  Prometheus/Grafana UIs). Adding email later means adding Alertmanager with
  an SMTP receiver — the rules need no change.

## Observability (fatia 2 — logs)

* `deploy/observability/loki.yml` (single binary, filesystem, 15-day
  retention) + `promtail.yml` (Docker discovery, JSON pipeline). Loki and
  Promtail are internal-only, no published ports.
* Services log raw JSON lines to stdout **in production only** (pretty output
  stays in local files / non-prod consoles). Only `service` + `level` become
  Loki labels — `orderId`/`paymentId`/event stay searchable in the body, never
  in labels (cardinality + LGPD). Non-JSON lines (Caddy, Redis, boot) still
  ship, without parsed labels.
* Grafana reads Loki via the provisioned `Loki` datasource; the `logs.json`
  dashboard has error rate, error stream and a free-text search (e.g.
  `orderId`).
* `traceId` correlation stays scoped to fatia 3 (needs OpenTelemetry
  propagation — there is no trace id to attach yet).

One-off steps when adopting this setup (in addition to the storage keys
below): on each Docker host, write the shared scrape token to a root-only
host file and set the Grafana admin password in the real env file:

```bash
install -d -m 755 /etc/pode-deixar
openssl rand -hex 32 > /etc/pode-deixar/metrics_token
chmod 600 /etc/pode-deixar/metrics_token
# METRICS_TOKEN in .env.dev / .env.staging / .env.production must hold the
# same value; GF_SECURITY_ADMIN_PASSWORD likewise (strong, per environment).
```

## Rules

* One Compose file per environment (`staging` / `production`); staging
  includes the production file and only swaps the environment configuration.
* No publicly published ports except Caddy 80/443; loopback-only ports
  (`127.0.0.1`) are allowed for internal UIs (Prometheus, Grafana). No local
  Postgres, frontend, or Mailpit in the deploy files.
* One Redis instance per stack; `auth` runs `prisma migrate deploy` on startup.
* Renaming a stack `name` orphans its volumes. Migrating SeaweedFS data requires a
  manual volume copy (`seaweedfs_data`) before dropping the old volumes.
* Secrets live in GitHub Environments (`staging` / `production`), never in git.
  Agents must never open the real `.env.staging` / `.env.production` files.
