FROM oven/bun:1-alpine

WORKDIR /engine

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

ARG DATABASE_URL="postgresql://user:password@engine-postgres:5432/engine_db"
ENV DATABASE_URL=$DATABASE_URL

RUN bunx prisma generate

CMD ["bun", "run", "dev:docker"]