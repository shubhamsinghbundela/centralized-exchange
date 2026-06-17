import type { CreateOrderInput } from "../../store/exchange-store";
import { getBalance } from "../../utils/getBalance";
import { getOrderBook } from "../../utils/getOrderBook";

/**
 * Market buy orders consume liquidity from the ask side.
 * Calculate the total USD needed by simulating execution
 * against the current order book.
 *
 * Start from the cheapest ask and move upward until
 * the requested quantity is fully satisfied.
 */
export function validateMarketBuyBalance(input: CreateOrderInput) {
  const usdBalance = getBalance(input.userId, "USD");

  const book = getOrderBook(input.symbol);

  let remainingQty = input.qty;
  let requiredUsd = 0;

  // Market buy consumes cheapest asks first
  const prices = [...book.asks.keys()].sort((a, b) => a - b);

  for (const price of prices) {
    const restingOrders = book.asks.get(price);

    if (!restingOrders) {
      continue;
    }

    for (const restingOrder of restingOrders) {
      if (remainingQty <= 0) {
        break;
      }

      const availableQty = restingOrder.qty - restingOrder.filledQty;

      if (availableQty <= 0) {
        continue;
      }

      const matchedQty = Math.min(remainingQty, availableQty);

      requiredUsd += matchedQty * price;

      remainingQty -= matchedQty;
    }

    if (remainingQty <= 0) {
      break;
    }
  }

  // Ensure the user has enough USD to execute the market buy.
  if (usdBalance.available < requiredUsd) {
    throw new Error("Insufficient USD balance");
  }
}
