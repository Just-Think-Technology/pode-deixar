# purpose: Multi-stage Docker build for Pode Deixal services (auth, users, service-orders, payments, reviews)

# --- Base ---
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache openssl
WORKDIR /app
# Corepack enabled for pnpm runtime (node user runs the process)
ENV COREPACK_HOME=/usr/local/share/corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- Deps ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY shared/logger/package.json ./shared/logger/
COPY shared/email/package.json ./shared/email/
COPY shared/security/package.json ./shared/security/
COPY shared/validation/package.json ./shared/validation/
COPY services/auth/package.json ./services/auth/
COPY services/users/package.json ./services/users/
COPY services/service-orders/package.json ./services/service-orders/
COPY services/payments/package.json ./services/payments/
COPY services/reviews/package.json ./services/reviews/
RUN pnpm install --frozen-lockfile

# --- Prisma ---
FROM deps AS prisma
COPY prisma ./prisma
COPY services/auth/package.json ./services/auth/
RUN pnpm exec prisma generate --schema=prisma/schema.prisma

# --- Auth-build ---
FROM prisma AS auth-build
COPY shared/logger ./shared/logger
COPY shared/email ./shared/email
COPY shared/security ./shared/security
COPY shared/validation ./shared/validation
COPY services/auth ./services/auth
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/logger build && pnpm run --filter @pode-deixar/email build && pnpm run --filter @pode-deixar/security build && pnpm run --filter @pode-deixar/validation build && pnpm run --filter @pode-deixar/auth build
RUN printf '#!/bin/sh\nMAX_RETRIES=6\nRETRY_DELAY=5\nretry=0\nwhile [ $retry -lt $MAX_RETRIES ]; do\n  if pnpm exec prisma migrate deploy --schema=prisma/schema.prisma; then\n    echo "=== [entrypoint] Migrations applied successfully ==="\n    break\n  fi\n  retry=$((retry + 1))\n  if [ $retry -lt $MAX_RETRIES ]; then\n    echo "=== [entrypoint] Migration attempt $retry failed, retrying in ${RETRY_DELAY}s... ==="\n  else\n    echo "=== [entrypoint] All migration attempts failed. Starting service anyway... ==="\n  fi\ndone\nexec "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh
# Why: non-root user enforcement (chown + mkdir) done in subsequent steps
RUN chown -R node:node /app && mkdir -p /home/node && chown node:node /home/node
ENV HOME=/home/node
USER node
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "services/auth/dist/main.js"]

# --- Users-build ---
FROM prisma AS users-build
COPY shared/logger ./shared/logger
COPY shared/email ./shared/email
COPY shared/security ./shared/security
COPY shared/validation ./shared/validation
COPY services/users ./services/users
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/logger build && pnpm run --filter @pode-deixar/security build && pnpm run --filter @pode-deixar/validation build && pnpm run --filter @pode-deixar/users build
# Why: non-root user enforcement (chown + mkdir) done in subsequent steps
RUN chown -R node:node /app && mkdir -p /home/node && chown node:node /home/node
ENV HOME=/home/node
USER node
EXPOSE 3002
CMD ["node", "services/users/dist/main.js"]

# --- Service-orders-build ---
FROM prisma AS service-orders-build
COPY shared/logger ./shared/logger
COPY shared/email ./shared/email
COPY shared/security ./shared/security
COPY shared/validation ./shared/validation
COPY services/service-orders ./services/service-orders
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/logger build && pnpm run --filter @pode-deixar/security build && pnpm run --filter @pode-deixar/validation build && pnpm run --filter @pode-deixar/service-orders build
# Why: non-root user enforcement (chown + mkdir) done in subsequent steps
RUN chown -R node:node /app && mkdir -p /home/node && chown node:node /home/node
ENV HOME=/home/node
USER node
EXPOSE 3003
CMD ["node", "services/service-orders/dist/main.js"]

# --- Payments-build ---
FROM prisma AS payments-build
COPY shared/logger ./shared/logger
COPY shared/security ./shared/security
COPY shared/validation ./shared/validation
COPY services/payments ./services/payments
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/logger build && pnpm run --filter @pode-deixar/security build && pnpm run --filter @pode-deixar/validation build && pnpm run --filter @pode-deixar/payments build
# Why: non-root user enforcement (chown + mkdir) done in subsequent steps
RUN chown -R node:node /app && mkdir -p /home/node && chown node:node /home/node
ENV HOME=/home/node
USER node
EXPOSE 3004
CMD ["node", "services/payments/dist/main.js"]

# --- Reviews-build ---
FROM prisma AS reviews-build
COPY shared/logger ./shared/logger
COPY shared/security ./shared/security
COPY shared/validation ./shared/validation
COPY services/reviews ./services/reviews
RUN pnpm install --no-frozen-lockfile && pnpm run --filter @pode-deixar/logger build && pnpm run --filter @pode-deixar/security build && pnpm run --filter @pode-deixar/validation build && pnpm run --filter @pode-deixar/reviews build
# Why: non-root user enforcement (chown + mkdir) done in subsequent steps
RUN chown -R node:node /app && mkdir -p /home/node && chown node:node /home/node
ENV HOME=/home/node
USER node
EXPOSE 3005
CMD ["node", "services/reviews/dist/main.js"]