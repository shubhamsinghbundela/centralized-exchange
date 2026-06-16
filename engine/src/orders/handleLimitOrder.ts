import {
  BALANCES,
  ORDERBOOKS,
  ORDERS,
  type CreateOrderInput,
} from "../store/exchange-store";
import { addRestingLimitOrder } from "./limit/addRestingLimitOrder";
import { createLimitOrderRecord } from "./limit/createLimitOrderRecord";
import { lockLimitBalance } from "./limit/lockLimitBalance";
import { matchLimitOrder } from "./limit/matchLimitOrder";

export function handleLimitOrder(input: CreateOrderInput) {
  if (input.price === null) {
    throw new Error("Price is required for limit orders");
  }

  // Validate and move balance, funds/assets from available -> locked
  lockLimitBalance(input);

  // Create New Order Record
  const { orderId, order } = createLimitOrderRecord(input);

  // Match Incoming Order
  const { remainingQty, fills, averagePrice } = matchLimitOrder({
    input,
    orderId,
  });

  // Add Remaining Quantity To Order Book
  addRestingLimitOrder({
    input,
    orderId,
    remainingQty,
  });

  // Update Order Record
  order.filledQty = input.qty - remainingQty;

  order.status =
    remainingQty === 0
      ? "filled"
      : remainingQty === input.qty
        ? "open"
        : "partially_filled";

  order.fills = fills;

  ORDERS.set(orderId, order);

  console.log("ORDERBOOKS", ORDERBOOKS);
  console.log("ORDERS", ORDERS);
  console.log("BALANCES", BALANCES);

  return {
    orderId,
    status: order.status,
    filledQty: order.filledQty,
    remainingQty,
    averagePrice,
    fills,
  };
}
