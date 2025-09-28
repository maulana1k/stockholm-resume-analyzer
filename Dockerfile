FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

COPY . .

RUN bun install \
  && bunx prisma generate \
  && bun run build --minify --sourcemap=none

FROM oven/bun:1.1-alpine AS runner

WORKDIR /app

RUN adduser -D -s /bin/sh appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /app/storage/uploads /app/storage/temp \
  && chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]
