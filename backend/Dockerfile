FROM oven/bun:1-alpine

WORKDIR /backend

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN bunx prisma generate

EXPOSE 3000

CMD ["bun", "run", "dev:docker"]