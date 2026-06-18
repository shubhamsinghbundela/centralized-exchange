import "dotenv/config";
import { createClient } from "redis";
import { env } from "./utils/env.js";
import { handleDeposit } from "./deposits/deposit.js";
import { handleCreateOrder } from "./orders/handleCreateOrder.js";
import { getDepth } from "./depth/getDepth.js";
import { getUserBalance } from "./balance/getUserBalance.js";
import { getOrder } from "./orders/getOrder.js";

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

await Promise.all([brokerClient.connect(), responseClient.connect()]);

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

async function sendResponse(
  responseQueue: string,
  response: EngineResponse,
): Promise<void> {
  await responseClient.lPush(responseQueue, JSON.stringify(response));
}

function handleEngineRequest(message: EngineRequest): unknown {
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
    return handleCreateOrder(message.payload);
  }

  if (message.type === "deposit") {
    return handleDeposit(message.payload);
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

  throw new Error("TODO(student): implement this engine request type");
}

console.log(`Engine listening on Redis queue: ${env.incomingQueue}`);

for (;;) {
  const item = await brokerClient.brPop(env.incomingQueue, 0);
  if (!item) continue;

  let message: EngineRequest;

  try {
    message = JSON.parse(item.element) as EngineRequest;
  } catch {
    console.error("Skipping invalid broker message");
    continue;
  }

  try {
    const data = handleEngineRequest(message);
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
