# 🐳 Docker Setup (Manual)

## 1. Pull Required Images

```bash
docker pull postgres:latest
docker pull redis/redis-stack:latest
```

## 2. Create Docker Network

All containers communicate through the same Docker network.

```bash
docker network create cex-network
```

## 3. Run Redis

```bash
docker run --name redis-stack --network cex-network -p 6379:6379 -p 8001:8001 -v redis-data:/data -d redis/redis-stack:latest
```

Redis is available to other containers at:

```text
redis://redis-stack:6379
```

## 4. Run Backend PostgreSQL

```bash
docker run --name cex-postgres --network cex-network -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=cex -p 5432:5432 -v cex-postgres-data:/var/lib/postgresql -d postgres:latest
```

Internal Docker connection URL:

```text
postgresql://user:password@cex-postgres:5432/cex
```

## 5. Run Engine PostgreSQL

```bash
docker run --name engine-postgres --network cex-network -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=engine_db -p 5433:5432 -v engine-postgres-data:/var/lib/postgresql -d postgres:latest
```

Internal Docker connection URL:

```text
postgresql://user:password@engine-postgres:5432/engine_db
```

## 6. Configure Backend Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@cex-postgres:5432/cex
REDIS_URL=redis://redis-stack:6379
```

## 7. Build and Run Backend

Navigate to the backend directory:

```bash
cd backend
```

Build the Backend image with the PostgreSQL connection URL:

```bash
docker build --build-arg DATABASE_URL="postgresql://user:password@cex-postgres:5432/cex" -t cex-backend .
```

Run the Backend container:

```bash
docker run --name cex-backend --network cex-network --env-file .env -p 3000:3000 -d cex-backend:latest
```

## 8. Configure Engine Environment Variables

Create `engine/.env`:

```env
DATABASE_URL=postgresql://user:password@engine-postgres:5432/engine_db
REDIS_URL=redis://redis-stack:6379
```

## 9. Build and Run Engine

Navigate to the engine directory:

```bash
cd engine
```

Build the Engine image with the Engine PostgreSQL connection URL:

```bash
docker build --build-arg DATABASE_URL="postgresql://user:password@engine-postgres:5432/engine_db" -t cex-engine .
```

Run the Engine container:

```bash
docker run --name cex-engine --network cex-network --env-file .env -d cex-engine:latest
```

## 10. Configure WebSocket Server

The WebSocket server consumes depth updates from Redis Streams.

Create `websocket-server/.env`:

```env
REDIS_URL=redis://redis-stack:6379
```

## 11. Build and Run WebSocket Server

```bash
cd websocket-server

docker build -t cex-websocket-server .

docker run --name cex-websocket-server --network cex-network --env-file .env -p 8080:8080 -d cex-websocket-server:latest
```

## 12. Configure WebSocket Client

The WebSocket client connects to the WebSocket server for real-time depth updates and fetches the initial order book snapshot from the backend.

```env
WS_URL=ws://cex-websocket-server:8080
BACKEND_URL=http://cex-backend:3000
```

## 13. Build and Run WebSocket Client

```bash
cd websocket-client

docker build -t cex-websocket-client .

docker run --name cex-websocket-client --network cex-network -e WS_URL="ws://cex-websocket-server:8080" -e BACKEND_URL="http://cex-backend:3000" -d cex-websocket-client:latest
```

The WebSocket client does not need a published port because it only makes outgoing connections.

## 14. Check Running Containers

```bash
docker ps
```

To see all containers, including stopped containers:

```bash
docker ps -a
```

## 15. Check Logs

```bash
docker logs cex-backend
docker logs cex-engine
docker logs cex-websocket-server
docker logs cex-websocket-client
```

For live logs:

```bash
docker logs -f cex-backend
docker logs -f cex-engine
docker logs -f cex-websocket-server
docker logs -f cex-websocket-client
```
