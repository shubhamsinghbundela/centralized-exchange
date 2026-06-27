import type {
  CreateOrderInput,
  DepthDelta,
  RestingOrder,
} from "../../store/exchange-store";
import { getOrderBook } from "../../utils/getOrderBook";

/**
 * If the order was not fully filled during matching,
 * the remaining quantity becomes a resting maker order
 * and is added to the appropriate side of the order book.
 */
export function addRestingLimitOrder({
  input,
  orderId,
  remainingQty,
  depthDelta,
}: {
  input: CreateOrderInput;
  orderId: string;
  remainingQty: number;
  depthDelta: DepthDelta;
}) {
  // Fully matched orders should not be added to the order book.
  if (remainingQty <= 0) {
    return;
  }

  // Get Order Book
  const book = getOrderBook(input.symbol);

  // Any unfilled quantity becomes a resting maker order
  // and waits in the order book for future matches.
  const restingOrder: RestingOrder = {
    orderId,
    userId: input.userId,
    side: input.side,
    type: "limit",
    symbol: input.symbol,
    price: input.price!,
    qty: input.qty,
    filledQty: input.qty - remainingQty,
    status: remainingQty === input.qty ? "open" : "partially_filled",
    createdAt: Date.now(),
  };

  // Buy orders go into bids, sell orders go into asks.
  const sideMap = input.side === "buy" ? book.bids : book.asks;

  // Get existing orders at this price level or create a new level.
  const level = sideMap.get(input.price!) ?? [];

  level?.push(restingOrder);

  sideMap?.set(input.price!, level);

  if (input.side === "buy") {
    depthDelta.bids.add(input.price!);
  } else {
    depthDelta.asks.add(input.price!);
  }
}
