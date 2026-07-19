# 🐳 Docker Setup

## 1. Pull Required Images

```bash
docker pull postgres:latest
docker pull redis/redis-stack:latest
```

## 2. Create Docker Network

```bash
docker network create cex-network
```

## 3. Run Redis

```bash
docker run --name redis-stack --network cex-network -p 6379:6379 -p 8001:8001 -v redis-data:/data -d redis/redis-stack:latest
```

## 4. Run Backend PostgreSQL

```bash
docker run --name cex-postgres --network cex-network -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=cex -p 5432:5432 -v cex-postgres-data:/var/lib/postgresql -d postgres:latest
```

## 5. Run Engine PostgreSQL

```bash
docker run --name engine-postgres --network cex-network -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=engine_db -p 5433:5432 -v engine-postgres-data:/var/lib/postgresql -d postgres:latest
```

## 6. Backend Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@cex-postgres:5432/cex
REDIS_URL=redis://redis-stack:6379
```

## 7. Engine Environment Variables

Create `engine/.env`:

```env
DATABASE_URL=postgresql://user:password@engine-postgres:5432/engine_db
REDIS_URL=redis://redis-stack:6379
```

## 8. Build and Run Backend

```bash
cd backend

docker build -t cex-backend .

docker run --name cex-backend --network cex-network --env-file .env -p 3000:3000 -d cex-backend:latest
```

## 9. Build and Run Engine

From the project root:

```bash
cd engine

docker build -t cex-engine .

docker run --name cex-engine --network cex-network --env-file .env -d cex-engine:latest
```

## 10. Check Running Containers

```bash
docker ps
```

## 11. Check Logs

```bash
docker logs cex-backend
docker logs cex-engine
```

For live logs:

```bash
docker logs -f cex-backend
docker logs -f cex-engine
```
