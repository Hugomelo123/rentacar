# RENTACAR Railway build v4 — deve aparecer nos logs
FROM node:20-bookworm-slim AS build
RUN echo "=== RENTACAR DOCKER BUILD v4 ==="
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY . .
RUN pnpm install --no-frozen-lockfile

ENV BASE_PATH=/ PORT=8080 NODE_ENV=production
RUN pnpm --filter @workspace/rentacar-dashboard run build
RUN pnpm --filter @workspace/api-server run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_DASHBOARD=true
ENV BASE_PATH=/
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/rentacar-dashboard/dist/public ./artifacts/rentacar-dashboard/dist/public
COPY --from=build /app/scripts/init-schema.sql ./scripts/init-schema.sql
EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.mjs"]
