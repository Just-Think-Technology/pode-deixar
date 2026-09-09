# Deploy (All-Free Topology)

> Stack files: `docker-compose.yml` + `docker-compose.dev.yml` (local),
> `docker-compose.staging.yml` / `docker-compose.prod.yml` (deploy),
> `Caddyfile.docker` / `Caddyfile.prod`, `.env.example` (single template —
> real `.env.staging` / `.env.production` never in git). Cada arquivo tem
> `name` próprio, então os comandos não precisam de `-p` nem `--env-file`.

## Commands

| Onde | Comando |
|---|---|
| Local (hot-reload, banco staging) | `docker compose -f docker-compose.dev.yml up -d --build` |
| Local (imagens, banco staging) | `docker compose --env-file .env.staging up -d --build` |
| Staging (VPS) | `docker compose -f docker-compose.staging.yml up -d --build` |
| Produção (VPS) | `docker compose -f docker-compose.prod.yml up -d --build` |

## Local

- Tudo roda local, exceto o banco: `DATABASE_URL` aponta para o Neon de
  staging — não há Postgres local; o storage é o MinIO local (minioadmin)
- O `auth` aplica `prisma migrate deploy` no startup, então subir a stack
  pode aplicar DDL no banco de staging; nunca rode nada destrutivo contra
  staging à mão
- Mailpit (`:8025`) é local-only; edições em `backend/shared/*` exigem
  rebuild do serviço (o watch cobre só o `src` de cada serviço)

## Deploy

- One-off ao adotar este esquema: adicionar `MINIO_ROOT_USER` /
  `MINIO_ROOT_PASSWORD` (espelhando `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`)
  nos `.env.staging` / `.env.production` reais — o servidor MinIO só lê
  `MINIO_ROOT_*`, e os arquivos de deploy não interpolam mais variáveis

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
