import type { CreateOrderInput, OrderRecord } from "../../store/exchange-store";

/**
 * Creates a new limit order record with its initial state
 * before the matching process begins.
 */
export function createLimitOrderRecord(input: CreateOrderInput) {
  const orderId = crypto.randomUUID();

  const order: OrderRecord = {
    orderId,
    userId: input.userId,
    side: input.side,
    type: input.type,
    symbol: input.symbol,
    price: input.price,
    qty: input.qty,
    filledQty: 0,
    status: "open",
    fills: [],
    createdAt: Date.now(),
  };

  return {
    orderId,
    order,
  };
}
