FROM node:22-alpine AS build
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
# Cache do corepack em local legível por qualquer usuário (runtime roda como `node`)
ENV COREPACK_HOME=/usr/local/share/corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.ts ./

# Endurecimento: executa como usuário não-root (`node` já existe no node:22-alpine)
RUN chown -R node:node /app && mkdir -p /home/node && chown node:node /home/node
ENV HOME=/home/node
USER node

EXPOSE 3000
CMD ["pnpm", "start"]
