# ============================================================
# Pode Deixar - Backend (multi-stage para auth + users + services)
# ============================================================
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── Dependências (camada de cache) ─────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY shared/logger/package.json ./shared/logger/
COPY shared/email/package.json ./shared/email/
COPY services/auth/package.json ./services/auth/
COPY services/users/package.json ./services/users/
COPY services/service-orders/package.json ./services/service-orders/
RUN pnpm install --frozen-lockfile

# ─── Prisma Generate ────────────────────────────────────────
FROM deps AS prisma
COPY prisma ./prisma
COPY services/auth/package.json ./services/auth/
RUN pnpm exec prisma generate --schema=prisma/schema.prisma

# ─── Auth Service ───────────────────────────────────────────
FROM prisma AS auth-build
COPY shared/logger ./shared/logger
COPY shared/email ./shared/email
COPY services/auth ./services/auth
COPY scripts/migrate-and-start.sh ./scripts/migrate-and-start.sh
RUN pnpm install --no-frozen-lockfile && chmod +x ./scripts/migrate-and-start.sh && pnpm run --filter @pode-deixar/auth build
EXPOSE 3001
ENTRYPOINT ["./scripts/migrate-and-start.sh"]
CMD ["node", "services/auth/dist/main.js"]

# ─── Users Service ──────────────────────────────────────────
FROM prisma AS users-build
COPY shared/logger ./shared/logger
COPY shared/email ./shared/email
COPY services/users ./services/users
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/users build
EXPOSE 3002
CMD ["node", "services/users/dist/main.js"]

# ─── Service Orders Service ─────────────────────────────────
FROM prisma AS service-orders-build
COPY shared/logger ./shared/logger
COPY shared/email ./shared/email
COPY services/service-orders ./services/service-orders
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/service-orders build
EXPOSE 3003
CMD ["node", "services/service-orders/dist/main.js"]
