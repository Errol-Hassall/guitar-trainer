# syntax=docker/dockerfile:1

FROM oven/bun:1.4.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.4.4 AS runtime
ENV NODE_ENV=production \
    DATABASE_PATH=/data/guitar-trainer.db \
    PORT=3000 \
    HOST=0.0.0.0 \
    PUID=1000 \
    PGID=1000 \
    TZ=UTC
WORKDIR /app
COPY --from=build /app/.output /app/.output
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
