# Deploy (All-Free Topology)

> Stack files: `docker-compose.yml` (local, staging DB), `docker-compose.prod.yml`
> (staging/prod deploy), `Caddyfile.docker` / `Caddyfile.prod`, `.env.example`
> (single template — real `.env.staging` / `.env.production` never in git).

## Local

- `docker compose --env-file .env.staging up -d --build` (add
  `-f docker-compose.dev.yml` for hot-reload)
- Everything runs locally except the database: `DATABASE_URL` points to the
  Neon staging DB — there is no local Postgres
- The `auth` image runs `prisma migrate deploy` on startup, so bringing the
  stack up may apply DDL to the staging DB; never run anything destructive
  against staging by hand
- Mailpit (`:8025`) is local-only; MinIO/Redis/Caddy are local

## Topology

| Piece | Staging | Production | Notes |
|---|---|---|---|
| Frontend | Vercel (preview/`develop`) | Vercel (`main`) | `FRONTEND_URL` / `ALLOWED_ORIGINS` per env |
| Backend | 1 Oracle ARM VPS, `-p pode-deixar-staging` | same VPS, `-p pode-deixar-prod` | project name isolates volumes, networks, Redis |
| Database | Neon (staging DB) | Neon (prod DB) | `DATABASE_URL` with `?sslmode=require`; app role is least-privilege |
| DNS/CDN | Cloudflare | Cloudflare | A record → VPS; Caddy issues HTTPS automatically |
| SMTP | Resend/Brevo (test key) | Resend/Brevo | Mailpit is local-only |
| Storage | MinIO on the VPS | MinIO on the VPS | buckets via `minio-setup`; public URL behind Caddy |

## Rules

- Single compose file for both envs; the env is selected with
  `ENV_FILE=.env.staging|production` (the file fails fast when unset)
- No published ports except Caddy 80/443; no local Postgres/frontend/Mailpit
  in the prod file
- One Redis per stack; migrations (`pnpm prisma:migrate`) run before `up`
- Secrets live in GitHub Environments (`staging` / `production`), never in git —
  agents must never open the real `.env.staging` / `.env.production` files
