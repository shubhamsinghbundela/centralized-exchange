import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { appRouter } from "./routes/index.js";
import { env } from "./utils/env.js";
import {
  connectRedis,
  listenForEngineResponses,
  pingRedis,
} from "./utils/engine-client.js";

await connectRedis();
void listenForEngineResponses();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  await pingRedis();
  res.json({ ok: true });
});

app.use(appRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: err instanceof Error ? err.message : "internal_server_error",
  });
});

app.listen(env.port, () => {
  console.log(`Backend running on http://localhost:${env.port}`);
  console.log(`Response queue: ${env.responseQueue}`);
});
