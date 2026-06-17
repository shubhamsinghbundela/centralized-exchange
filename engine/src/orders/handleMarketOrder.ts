import {
  BALANCES,
  ORDERBOOKS,
  ORDERS,
  type CreateOrderInput,
  type OrderRecord,
} from "../store/exchange-store";
import { validateAndLockMarketBalance } from "./market/validateAndLockMarketBalance";
import { matchMarketOrder } from "./market/matchMarketOrder";
import { getBalance } from "../utils/getBalance";

export function handleMarketOrder(input: CreateOrderInput) {
  // Validates that the user has sufficient balance for a market order
  // and locks the required funds/assets before matching begins.
  validateAndLockMarketBalance(input);

  const orderId = crypto.randomUUID();

  // Create a market order record
  const order: OrderRecord = {
    orderId,
    userId: input.userId,
    side: input.side,
    type: "market",
    symbol: input.symbol,
    price: null,
    qty: input.qty,
    filledQty: 0,
    status: "open",
    fills: [],
    createdAt: Date.now(),
  };

  // Match Incoming Order
  const { remainingQty, fills, averagePrice } = matchMarketOrder(input);

  const filledQty = input.qty - remainingQty;

  // Update Order Record
  order.filledQty = filledQty;
  order.fills = fills;

  order.status =
    filledQty === 0
      ? "cancelled"
      : remainingQty === 0
        ? "filled"
        : "partially_filled";

  ORDERS.set(orderId, order);

  if (input.side === "sell" && remainingQty > 0) {
    const assetBalance = getBalance(input.userId, input.symbol);

    assetBalance.locked -= remainingQty;
    assetBalance.available += remainingQty;
  }

  return {
    status:
      filledQty === 0
        ? "cancelled"
        : remainingQty === 0
          ? "filled"
          : "partially_filled",
    filledQty,
    averagePrice,
    fills,
  };
}
