# syntax=docker/dockerfile:1

ARG NODE_VERSION=26-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.14.0
WORKDIR /app

FROM base AS dependencies
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --store-dir /pnpm/store --frozen-lockfile

FROM dependencies AS migrator
CMD ["pnpm", "db:migrate"]

FROM dependencies AS builder
ARG APP
ARG WORKSPACE
RUN test -n "${APP}" && test -n "${WORKSPACE}"
RUN mkdir -p "apps/${APP}/public" && pnpm --filter "${WORKSPACE}" build

FROM node:${NODE_VERSION} AS runner
ARG APP
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/public ./apps/${APP}/public

USER nextjs
WORKDIR /app/apps/${APP}
EXPOSE 3000
CMD ["node", "server.js"]
