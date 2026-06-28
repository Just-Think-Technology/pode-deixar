# ============================================================
# Pode Deixar - Backend (multi-stage para auth + users)
# ============================================================
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── Dependências (camada de cache) ─────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/logger/package.json ./shared/logger/
COPY services/auth/package.json ./services/auth/
COPY services/users/package.json ./services/users/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ─── Prisma Generate ────────────────────────────────────────
FROM deps AS prisma
COPY prisma ./prisma
COPY services/auth/package.json ./services/auth/
RUN pnpm exec prisma generate --schema=prisma/schema.prisma

# ─── Auth Service ───────────────────────────────────────────
FROM prisma AS auth-build
COPY shared/logger ./shared/logger
COPY services/auth ./services/auth
COPY scripts/migrate-and-start.sh ./scripts/migrate-and-start.sh
RUN chmod +x ./scripts/migrate-and-start.sh && pnpm run build --filter @pode-deixar/auth
EXPOSE 3001
ENTRYPOINT ["./scripts/migrate-and-start.sh"]
CMD ["node", "services/auth/dist/main.js"]

# ─── Users Service ──────────────────────────────────────────
FROM prisma AS users-build
COPY shared/logger ./shared/logger
COPY services/users ./services/users
RUN pnpm run build --filter @pode-deixar/users
EXPOSE 3002
CMD ["node", "services/users/dist/main.js"]
