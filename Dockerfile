# syntax=docker/dockerfile:1
#
# docker compose up -d --build で起動し、http://localhost:3000 にアクセスしてください。

# node:sqlite（フラグなしで使える）のため Node.js 22.13 以上を使う
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --- 依存パッケージ ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- ビルド ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- 実行用イメージ ---
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    WIKI_DATA_DIR=/data \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning

RUN groupadd --system --gid 1001 wiki && \
    useradd --system --uid 1001 --gid 1001 --home-dir /app wiki && \
    mkdir /data && chown wiki:wiki /data

COPY --from=build --chown=wiki:wiki /app/.next/standalone ./
COPY --from=build --chown=wiki:wiki /app/.next/static ./.next/static
COPY --from=build --chown=wiki:wiki /app/scripts ./scripts

USER wiki
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/up').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# データベースの作成・マイグレーション・初期データ（wikiadmin）は初回のアクセス時に自動で行われる
CMD ["node", "server.js"]
