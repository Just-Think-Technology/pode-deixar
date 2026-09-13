# Deploy (All-Free Topology)

> Stack files: `docker-compose.yml` + `docker-compose.dev.yml` (local,
> `.env.dev`), `docker-compose.staging.yml` / `docker-compose.production.yml`
> (deploy), `Caddyfile.docker` / `Caddyfile.production`, `.env.example` (single
> template — real `.env.staging` / `.env.production` never in git). Cada
> arquivo de deploy tem `name` próprio, então os comandos não precisam
> de `-p` nem `--env-file`.

## Commands

| Onde | Comando |
|---|---|
| Local (imagens, Postgres local) | `docker compose up -d --build` |
| Local (hot-reload, Postgres local) | `docker compose -f docker-compose.dev.yml up -d --build` |
| Staging (VPS, hot-reload) | `docker compose -f docker-compose.staging.yml up -d --build` |
| Produção (VPS, imagens) | `docker compose -f docker-compose.production.yml up -d --build` |

Atalho: `scripts/stack-up [dev|staging|production]` roda o `up -d --build`
do arquivo correspondente e imprime no fim onde cada coisa está rodando
(front, API, serviços, Mailpit, MinIO, Postgres). Com
`STACK_UP_DRY_RUN=1` ele só imprime os endereços, sem subir nada. O
`docker compose up` puro não imprime esse resumo (o compose não tem hook
pós-subida) — por isso o atalho existe.

## Local

- Tudo roda local: Postgres próprio (host `localhost:15432`, entre
  containers `postgres:5432`), MinIO local (minioadmin), Redis, Mailpit,
  Caddy (+ backup diário do banco local)
- Configs de dev vêm do `.env.dev` (versionado: só localhost e valores
  descartáveis); `DATABASE_URL` é montada para o Postgres local
- O `auth` aplica `prisma migrate deploy` no startup contra o banco local
- Mailpit (`:8025`) é local-only; `dist` dos packages `shared` é gerado
  dentro do container (`prestart:dev` + scripts `watch:*` de cada serviço)
  — nunca monte `dist` do host, senão o volume sobrescreve o build e o
  serviço quebra com `MODULE_NOT_FOUND`

## Deploy

- Staging roda em hot-reload (mesmos serviços da prod, código montado +
  `start:dev`); produção roda imagens compiladas. Listas de volumes do
  staging: manter espelhadas com o `docker-compose.dev.yml`
- O `auth` aplica `prisma migrate deploy` no startup contra o Neon de cada
  ambiente; nunca rode nada destrutivo contra staging/prod à mão

- One-off ao adotar este esquema: adicionar `MINIO_ROOT_USER` /
  `MINIO_ROOT_PASSWORD` (espelhando `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`)
  nos `.env.staging` / `.env.production` reais — o servidor MinIO só lê
  `MINIO_ROOT_*`, e os arquivos de deploy não interpolam mais variáveis

## Topology

| Piece | Staging | Production | Notes |
|---|---|---|---|
| Frontend | Vercel (preview/`develop`) | Vercel (`main`) | `FRONTEND_URL` / `ALLOWED_ORIGINS` per env |
| Backend | 1 Oracle ARM VPS, `pode-deixar-staging` | same VPS, `pode-deixar-production` | project `name` isolates volumes, networks, Redis |
| Database | Neon (staging DB) | Neon (prod DB) | `DATABASE_URL` with `?sslmode=require`; app role is least-privilege |
| DNS/CDN | Cloudflare | Cloudflare | A record → VPS; Caddy issues HTTPS automatically |
| SMTP | Resend/Brevo (test key) | Resend/Brevo | Mailpit is local-only |
| Storage | MinIO on the VPS | MinIO on the VPS | buckets via `minio-setup`; public URL behind Caddy |

## Rules

- One compose file per env (`staging` / `production`); staging includes the
  production file and only swaps the env
- No published ports except Caddy 80/443; no local Postgres/frontend/Mailpit
  in the deploy files
- One Redis per stack; `auth` runs `prisma migrate deploy` on startup
- Renaming a stack `name` orphans its volumes: migrating MinIO data needs a
  manual volume copy (see chat/PR history) before dropping the old ones
- Secrets live in GitHub Environments (`staging` / `production`), never in git —
  agents must never open the real `.env.staging` / `.env.production` files
