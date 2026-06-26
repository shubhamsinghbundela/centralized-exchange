import {
  BALANCES,
  ORDERBOOKS,
  ORDERS,
  FILLS,
  type Balance,
} from "../store/exchange-store.js";
import { createClient } from "redis";
import { env } from "../utils/env.js";
import Decimal from "decimal.js";

const redis = createClient({
  url: env.redisUrl,
});

await redis.connect();

export async function loadEngineState() {
  const balances = await redis.get("engine:balances");
  const orders = await redis.get("engine:orders");
  const orderbooks = await redis.get("engine:orderbooks");
  const fills = await redis.get("engine:fills");

  if (balances) {
    BALANCES.clear();

    Object.entries(JSON.parse(balances)).forEach(([userId, assets]) => {
      const restoredBalances: Record<string, Balance> = {};

      for (const [asset, balance] of Object.entries(
        assets as Record<string, any>,
      )) {
        restoredBalances[asset] = {
          available: new Decimal(balance.available),
          locked: new Decimal(balance.locked),
        };
      }

      BALANCES.set(userId, restoredBalances);
    });
  }

  if (orders) {
    ORDERS.clear();

    for (const [orderId, order] of JSON.parse(orders)) {
      ORDERS.set(orderId, order);
    }
  }

  if (orderbooks) {
    ORDERBOOKS.clear();

    for (const book of JSON.parse(orderbooks)) {
      ORDERBOOKS.set(book.symbol, {
        bids: new Map(book.bids),
        asks: new Map(book.asks),
      });
    }
  }

  if (fills) {
    FILLS.length = 0;
    FILLS.push(...JSON.parse(fills));
  }

  console.log("Engine state restored");
}
