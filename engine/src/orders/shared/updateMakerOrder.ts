import { ORDERS, type Fill } from "../../store/exchange-store";

export function updateMakerOrder({
  orderId,
  matchedQty,
  fill,
}: {
  orderId: string;
  matchedQty: number;
  fill: Fill;
}) {
  const makerOrder = ORDERS.get(orderId);

  if (!makerOrder) {
    return;
  }

  makerOrder.filledQty += matchedQty;

  makerOrder.status =
    makerOrder.filledQty === makerOrder.qty ? "filled" : "partially_filled";

  makerOrder.fills.push(fill);
}
