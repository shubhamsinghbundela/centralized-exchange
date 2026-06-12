import "dotenv/config";
import { createClient } from "redis";
import { env } from "./utils/env.js";

export type EngineCommandType =
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

const brokerClient = createClient({ url: env.redisUrl }).on("error", (error) => {
  console.error("Redis broker client error", error);
});

const responseClient = createClient({ url: env.redisUrl }).on("error", (error) => {
  console.error("Redis response client error", error);
});

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

async function sendResponse(responseQueue: string, response: EngineResponse): Promise<void> {
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
    return {
      orderId: crypto.randomUUID(),
      status: "filled",
      filledQty: DUMMY_SELL_ORDER.qty,
      averagePrice: DUMMY_SELL_ORDER.price,
      fills: [
        {
          fillId: crypto.randomUUID(),
          symbol: DUMMY_SELL_ORDER.symbol,
          price: DUMMY_SELL_ORDER.price,
          qty: DUMMY_SELL_ORDER.qty,
          buyOrderId: "request-buy-order",
          sellOrderId: DUMMY_SELL_ORDER.orderId,
        },
      ],
      note: "Smoke-test response only. Students must replace this with real matching logic.",
    };
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