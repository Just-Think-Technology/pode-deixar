# Deploy (All-Free Topology)

> The stack definition (`docker-compose.prod.yml`, `Caddyfile.prod`,
> `.env.deploy.example`) lands with the staging/prod deploy change;
> this doc describes the topology and the operation.

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
