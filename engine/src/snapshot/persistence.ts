import {
  BALANCES,
  ORDERBOOKS,
  ORDERS,
  FILLS,
} from "../store/exchange-store.js";
import { createClient } from "redis";
import { env } from "../utils/env.js";

const redis = createClient({
  url: env.redisUrl,
});

await redis.connect();
export async function persistEngineState() {
  await redis.set(
    "engine:balances",
    JSON.stringify(Object.fromEntries(BALANCES)),
  );

  await redis.set("engine:orders", JSON.stringify([...ORDERS.entries()]));

  await redis.set(
    "engine:orderbooks",
    JSON.stringify(
      [...ORDERBOOKS.entries()].map(([symbol, book]) => ({
        symbol,
        bids: [...book.bids.entries()],
        asks: [...book.asks.entries()],
      })),
    ),
  );

  await redis.set("engine:fills", JSON.stringify(FILLS));
}
