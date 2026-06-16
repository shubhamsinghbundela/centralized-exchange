import {
  FILLS,
  type CreateOrderInput,
  type Fill,
  type RestingOrder,
} from "../../store/exchange-store";

export function createFill({
  input,
  orderId,
  restingOrder,
  price,
  matchedQty,
}: {
  input: CreateOrderInput;
  orderId: string;
  restingOrder: RestingOrder;
  price: number;
  matchedQty: number;
}) {
  const fill: Fill = {
    fillId: crypto.randomUUID(),
    symbol: input.symbol,
    price,
    qty: matchedQty,
    buyOrderId: input.side === "buy" ? orderId : restingOrder.orderId,
    sellOrderId: input.side === "sell" ? orderId : restingOrder.orderId,
    createdAt: Date.now(),
  };

  FILLS.push(fill);

  return fill;
}
