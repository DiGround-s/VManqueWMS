FROM node:22-slim AS build

WORKDIR /app

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
    && corepack prepare pnpm@10.15.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=vmanque-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false --store-dir /pnpm/store

COPY . .
RUN pnpm exec prisma generate && pnpm build

FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN corepack enable \
    && corepack prepare pnpm@10.15.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 \
    CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

# Applying migrations in the new container avoids running a new migration
# against the old application during Coolify's rolling deployment.
CMD ["sh", "-c", "pnpm db:deploy && exec pnpm start"]
