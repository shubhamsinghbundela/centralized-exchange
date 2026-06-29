# 🚀 Centralized Exchange (CEX)

A production-inspired **Centralized Exchange (CEX)** built from scratch using **Bun, TypeScript, Redis Streams, WebSockets, PostgreSQL, and Prisma**.

The project demonstrates how modern exchanges process orders with an **event-driven architecture**, maintain an **in-memory matching engine**, stream **real-time order book updates**, and persist state using **Redis snapshots**.

![Architecture](./assets/architecture.png)

---

## ✨ Features

* 🔐 JWT Authentication
* 💰 Deposit & Balance Management
* 📈 Limit Orders
* ⚡ Market Orders
* 📚 In-Memory Order Book
* 🤝 Price-Time Priority Matching Engine
* 📊 Real-time Market Depth
* 🔄 Order Cancellation
* 📝 Order History & Trade History
* 📡 WebSocket Orderbook & Trade Updates
* 📨 Redis for Backend ↔ Engine Communication
* 💾 Redis Snapshot Persistence
* ♻️ Automatic Recovery After Restart
* 🧪 Unit & Integration Tests with Bun Test + Supertest
* 🚀 Load Tested using k6

---

# 🏗️ Architecture

The exchange follows an event-driven architecture where the backend, matching engine, and WebSocket server are completely decoupled.

https://excalidraw.com/#json=x0mu118cARoXMC3iq5EjW,NZmpMHCex516O4ntDz6hVQ

---

# ⚙️ Tech Stack

| Layer          | Technology            |
| -------------- | --------------------- |
| Runtime        | Bun                   |
| Language       | TypeScript            |
| Backend        | Express               |
| Database       | PostgreSQL            |
| ORM            | Prisma                |
| Queue          | Redis Streams         |
| Realtime       | WebSockets            |
| Authentication | JWT                   |
| Validation     | Zod                   |
| Testing        | Bun Test   |
| Load Testing   | k6                    |
| Precision      | Decimal.js            |
| Persistence    | Redis Snapshots (RDB) |

---

# 📂 Project Structure

```text
centralized-exchange/
│
├── backend/
│
├── engine/
│
├── websocket/
│
├── load-tests/
│
└── docker-compose.yml
```

---

# 📖 Blog 
https://blog.realdev.club/building-a-mini-centralized-exchange-cex-with-bun-typescript-redis-and-postgresql
---

# ⭐ Support

If you found this project helpful:

* ⭐ Star the repository
* 🍴 Fork it
* 🐛 Open issues
* 🚀 Submit pull requests

Contributions are always welcome!

---

# 📜 License

MIT License

---

Built with ❤️ using Bun + TypeScript.
