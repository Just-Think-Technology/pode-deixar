# ============================================================
# Pode Deixar - Frontend (Next.js)
# ============================================================
FROM node:22-alpine AS build
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
WORKDIR /app
RUN corepack enable && corepack prepare npm@latest --activate

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare npm@latest --activate

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
