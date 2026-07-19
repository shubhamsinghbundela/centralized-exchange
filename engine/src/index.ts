import "dotenv/config";
import { createClient } from "redis";
import { env } from "./utils/env.ts";
import { handleDeposit } from "./deposits/deposit.ts";
import { handleCreateOrder } from "./orders/handleCreateOrder.ts";
import { getDepth } from "./depth/getDepth.ts";
import { getUserBalance } from "./balance/getUserBalance.ts";
import { getOrder } from "./orders/getOrder.ts";
import { cancelOrder } from "./orders/cancelOrder.ts";
import { persistEngineState } from "./snapshot/persistence.ts";
import { loadEngineState } from "./snapshot/loadEngineState.ts";
import "./marketClose/marketCloseCron.ts";
import type { DepthUpdate } from "./store/exchange-store.ts";

export type EngineCommandType =
  | "deposit"
  | "create_order"
  | "get_depth"
  | "get_user_balance"
  | "get_order"
  | "cancel_order";

export interface EngineRequest {
  correlationId: string;
  responseQueue: string;
  type: EngineCommandType;
  payload: Record<string, unknown>;
}

export interface EngineResponse {
  correlationId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

const brokerClient = createClient({ url: env.redisUrl }).on(
  "error",
  (error) => {
    console.error("Redis broker client error", error);
  },
);

const responseClient = createClient({ url: env.redisUrl }).on(
  "error",
  (error) => {
    console.error("Redis response client error", error);
  },
);

const streamClient = createClient({ url: env.redisUrl }).on(
  "error",
  (error) => {
    console.error("Redis stream client error", error);
  },
);

await Promise.all([
  brokerClient.connect(),
  responseClient.connect(),
  streamClient.connect(),
]);

await loadEngineState();

// :-)) I added this just to check the flow, remove it when you start
const DUMMY_SELL_ORDER = {
  orderId: "dummy-sell-order-1",
  userId: "dummy-seller",
  type: "limit",
  side: "sell",
  symbol: "BTC",
  price: 100,
  qty: 1,
  filledQty: 0,
  status: "open",
};

let mutationCount = 0;

async function snapshotIfNeeded() {
  mutationCount++;

  if (mutationCount % 5 !== 0) return;

  console.log("Persisting engine state...");

  await persistEngineState();

  try {
    await brokerClient.sendCommand(["BGSAVE"]);
    console.log("Redis background snapshot started.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Background save already in progress")
    ) {
      console.log(
        "Redis snapshot already in progress. Engine state is saved in Redis memory; skipping this snapshot.",
      );
      return;
    }

    throw error;
  }
}

async function publishDepthUpdate(depthUpdate: DepthUpdate) {
  await streamClient.xAdd("depth-stream", "*", {
    payload: JSON.stringify(depthUpdate),
  });
}

async function sendResponse(
  responseQueue: string,
  response: EngineResponse,
): Promise<void> {
  await responseClient.lPush(responseQueue, JSON.stringify(response));
}

async function handleEngineRequest(message: EngineRequest): Promise<unknown> {
  /**
   * TODO(student):
   * 1. Check _message.type.
   * 2. Read _message.payload.
   * 3. Call your order book / balance / order logic.
   * 4. Return the data that should go back to the backend.
   *
   * Required message types:
   * - create_order
   * - get_depth
   * - get_user_balance
   * - get_order
   * - cancel_order
   */

  // just checking the flow, remove this when you start implementing the logic
  if (message.type === "create_order") {
    const result = handleCreateOrder(message.payload);

    void snapshotIfNeeded().catch((err) => {
      console.error("Snapshot failed:", err);
    });

    return result;
  }

  if (message.type === "deposit") {
    const result = handleDeposit(message.payload);

    void snapshotIfNeeded().catch((err) => {
      console.error("Snapshot failed:", err);
    });

    return result;
  }

  if (message.type === "get_depth") {
    const { symbol } = message.payload as { symbol: string };

    return getDepth(symbol);
  }

  if (message.type === "get_order") {
    const { userId, orderId } = message.payload as {
      userId: string;
      orderId: string;
    };

    return getOrder(userId, orderId);
  }

  if (message.type === "get_user_balance") {
    const { userId } = message.payload as {
      userId: string;
    };

    return getUserBalance(userId);
  }

  if (message.type === "cancel_order") {
    const { userId, orderId } = message.payload as {
      userId: string;
      orderId: string;
    };

    const result = cancelOrder(userId, orderId);

    void snapshotIfNeeded().catch((err) => {
      console.error("Snapshot failed:", err);
    });

    return result;
  }

  throw new Error("TODO(student): implement this engine request type");
}

console.log(`Engine listening on Redis queue: ${env.incomingQueue}`);

for (;;) {
  const item = await brokerClient.brPop(env.incomingQueue, 0);
  if (!item) continue;

  console.log("Engine received:", item.element);

  let message: EngineRequest;

  try {
    message = JSON.parse(item.element) as EngineRequest;
  } catch {
    console.error("Skipping invalid broker message");
    continue;
  }

  try {
    const data = await handleEngineRequest(message);

    if (data && typeof data === "object" && "depthUpdate" in data) {
      const { depthUpdate } = data as {
        depthUpdate: DepthUpdate;
      };

      void publishDepthUpdate(depthUpdate).catch(console.error);
    }

    console.log("Sending response to:", message.responseQueue);
    await sendResponse(message.responseQueue, {
      correlationId: message.correlationId,
      ok: true,
      data,
    });
  } catch (error) {
    await sendResponse(message.responseQueue, {
      correlationId: message.correlationId,
      ok: false,
      error: error instanceof Error ? error.message : "engine_error",
    });
  }
}
