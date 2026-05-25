# Deploy único: API + painel no mesmo serviço (escolhe só o repositório no Railway)
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ENV BASE_PATH=/ PORT=8080
RUN pnpm --filter @workspace/rentacar-dashboard run build
RUN pnpm --filter @workspace/api-server run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_DASHBOARD=true
ENV BASE_PATH=/
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/rentacar-dashboard/dist/public ./artifacts/rentacar-dashboard/dist/public
COPY --from=build /app/scripts/init-schema.sql ./scripts/init-schema.sql
EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.mjs"]
