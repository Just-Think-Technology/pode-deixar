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

## Observability (fatia 1 — métricas)

* `deploy/observability/` holds `prometheus.yml` (5 scrape jobs + self +
  node-exporter), `rules.yml` (`ServiceDown`, `High5xxRate`, `HighP95Latency`,
  `DiskFull`) and Grafana provisioning + RED dashboard. Config in git, secrets
  never in git.
* `/metrics` on every service is internal-only: no Caddy route, no published
  port, plus a bearer guard (`MetricsGuard`, fail-closed). Prometheus scrapes
  over the compose network with the token from a host file (see one-off step).
* Prometheus/Grafana UIs bind host loopback only (`127.0.0.1:9090` /
  `127.0.0.1:3000`, dev Grafana on `:3300` because the dev frontend owns
  `:3000` and the frontend e2e server owns `:3100`) — reach them via SSH tunnel, e.g.
  `ssh -L 3000:127.0.0.1:3000 <vps>`. Retention is 15 days (`--storage.tsdb.retention.time`).
* Alert rules are dashboard-only by decision (firing state visible in the
  Prometheus/Grafana UIs). Adding email later means adding Alertmanager with
  an SMTP receiver — the rules need no change.

## Observability (fatia 2 — logs)

* `deploy/observability/loki.yml` (single binary, filesystem, 15-day
  retention) + `deploy/observability/alloy/config.alloy` (Docker discovery,
  JSON pipeline). Loki and Alloy are internal-only, no published ports.
* Services log raw JSON lines to stdout **in production only** (pretty output
  stays in local files / non-prod consoles). Only `service` + `level` become
  Loki labels — `orderId`/`paymentId`/event stay searchable in the body, never
  in labels (cardinality + LGPD). Non-JSON lines (Caddy, Redis, boot) still
  ship, without parsed labels.
* Grafana reads Loki via the provisioned `Loki` datasource; the `logs.json`
  dashboard has error rate, error stream and a free-text search (e.g.
  `orderId`).
* Alloy keeps the **whole** JSON line, not just `msg`: the `stage.json` only
  extracts, it does not rewrite the line, so `traceId`/`spanId` stay in it for
  the `TraceID` derived field to link a log entry to its trace in Tempo. The
  dashboard only has data in staging/production — services log pretty (not
  JSON) locally, so nothing is parsed into labels.
* Alloy replaced the EOL Promtail (Grafana published no 3.7.x tag; `:3` resolved
  to 3.6.8) with the same discovery, the same `container`/`compose_service`
  labels and the same JSON pipeline, so the datasource and the dashboards did
  not change. It reads the Docker API instead of the log files under
  `/var/lib/docker/containers`, which drops one host mount but adds a
  discovery requirement: **a container has to be discovered while it is still
  running.** `refresh_interval = 500ms` covers the one-shot jobs — `minio-setup`
  exits in well under a second and its output is lost at 1s — and a container
  removed with `docker run --rm` is never shipped (the stack does not use it).
  On the first start after a deploy the volume is empty, so the previous
  container output is re-read and Loki drops what is older than its acceptance
  window (`entry too far behind`); steady state is clean.
* Log lines carry `traceId`/`spanId` (written by the pino mixin in
  `@pode-deixar/logger` when a span is active), which fatia 3 links to Tempo.

## Observability (fatia 3 — traces)

* `deploy/observability/tempo.yml` (single binary, local storage, 15-day
  retention) receives OTLP/HTTP straight from the SDK — no collector.
  Internal-only: no published port, queried by Grafana over the compose network
  (`tempo:3200` for queries, `tempo:4318` for OTLP).
* `@pode-deixar/tracing` boots the SDK (`NodeSDK` + auto-instrumentation) as the
  first import of each `main.ts`, and `@pode-deixar/logger` adds `traceId`/
  `spanId` to every JSON line inside a span. Tempo and the logger therefore
  share the trace id — the `TraceID` derived field in the `Loki` datasource
  turns a log line into a link to its trace.
* Sampling is `ParentBased(TraceIdRatio)`: `OTEL_TRACES_SAMPLER_ARG=1.0` in
  `.env.dev` (every local trace), `0.1` elsewhere. `OTEL_ENABLED=false` skips
  SDK startup entirely — a service never blocks on a missing collector.
* Coverage: HTTP server/client spans, Nest handlers (the
  `auto-instrumentations-node` set) and **one span per Prisma operation**
  (`findUnique User`, `queryRaw`, …). Prisma's Rust query engine bypasses `pg`,
  so the spans come from a client extension built in `@pode-deixar/tracing` and
  applied once in `@pode-deixar/prisma` (`PrismaService`). Spans carry the model
  and the operation only — arguments and statements are never recorded, since
  they can carry personal data.
* Dashboards and datasources use fixed uids (`prometheus`, `loki`, `tempo`);
  panels reference the uid directly, because Grafana file provisioning does not
  substitute `${DS_*}` placeholders.
* Every observability image is pinned (`grafana:11.6.0`, `loki:3.7.8`,
  `alloy:v1.20.0`, `prometheus:v3.15.0`, `tempo:2.10.8`,
  `node-exporter:v1.12.1`) — a floating major tag pulls a new Grafana
  provisioner without review.
* Tempo 2.10 searches the ingester index, not the blocks: traces received
  before a Tempo restart do not show up in the TraceQL search (the traceId link
  from Loki still resolves them, since a full block read by id works). The
  search covers what arrived since the process started.
* Prometheus, Loki and Tempo run as the uid their image owns (65534 / 10001).
  With `cap_drop: ALL` there is no `CAP_DAC_OVERRIDE`, so `user: "0:0"` cannot
  write their volumes and the containers crash-loop at startup.

One-off steps when adopting this setup (in addition to the storage keys
below): on each Docker host, write the shared scrape token to a root-only
host file and set the Grafana admin password in the real env file:

```bash
install -d -m 755 /etc/pode-deixar
openssl rand -hex 32 > /etc/pode-deixar/metrics_token
# Prometheus runs as uid/gid 65534 (cap_drop ALL takes away the override that
# would let root write its TSDB volume), so the token must be readable by that
# group — root-only 600 makes every scrape fail with "unable to read
# authorization credentials".
chown root:65534 /etc/pode-deixar/metrics_token
chmod 640 /etc/pode-deixar/metrics_token
# METRICS_TOKEN in .env.dev / .env.staging / .env.production must hold the
# same value; GF_SECURITY_ADMIN_PASSWORD likewise (strong, per environment).
# The real .env.staging / .env.production also need the tracing trio from
# .env.example: OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT (http://tempo:4318)
# and OTEL_TRACES_SAMPLER_ARG.
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
