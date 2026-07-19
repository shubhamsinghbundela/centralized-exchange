## 🐳 Run Backend with Docker

Go to the Backend directory:

```bash
cd backend
```

Build the Backend Docker image:

```bash
docker build -t cex-backend .
```

Run the Backend container:

```bash
docker run --name cex-backend --network cex-network --env-file .env -p 3000:3000 -d cex-backend:latest
```

---

## 🐳 Run Engine with Docker

Go to the Engine directory:

```bash
cd engine
```

Build the Engine Docker image:

```bash
docker build -t cex-engine .
```

Run the Engine container:

```bash
docker run --name cex-engine --network cex-network --env-file .env -d cex-engine:latest
```

---

## Check Running Containers

```bash
docker ps
```

## Check Logs

```bash
docker logs cex-backend
docker logs cex-engine
```
