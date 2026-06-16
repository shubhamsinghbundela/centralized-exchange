import type { RestingOrder } from "../../store/exchange-store";

export function removeFilledOrders({
  side,
  price,
  restingOrders,
}: {
  side: Map<number, RestingOrder[]>;
  price: number;
  restingOrders: RestingOrder[];
}) {
  // Keep only orders that are still open or partially filled.
  side.set(
    price,
    restingOrders.filter((o) => o.status !== "filled"),
  );

  // If no orders remain at this price level then remove the entire price level from the order book.
  if (side.get(price)?.length === 0) {
    side.delete(price);
  }
}
