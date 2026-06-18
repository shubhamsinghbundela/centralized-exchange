import { BALANCES, ORDERBOOKS, ORDERS } from "../store/exchange-store";

export function cancelOrder(userId: string, orderId: string) {
  const order = ORDERS.get(orderId);

  if (!order) {
    throw new Error("order not found");
  }

  if (order.userId !== userId) {
    throw new Error("order not found");
  }

  if (order.status === "filled") {
    throw new Error("cannot cancel filled order");
  }

  if (order.status === "cancelled") {
    throw new Error("order already cancelled");
  }

  // remove from orderbook
  const orderBook = ORDERBOOKS.get(order.symbol);

  const levels = order.side === "buy" ? orderBook?.bids : orderBook?.asks;

  const priceLevel = levels?.get(order.price!);

  if (priceLevel) {
    const updated = priceLevel.filter((o) => o.orderId !== orderId);

    if (updated.length === 0) {
      levels?.delete(order.price!);
    } else {
      levels?.set(order.price!, updated);
    }
  }
  // unlock balances
  const remainingQty = order.qty - order.filledQty;
  const balances = BALANCES.get(userId)!;

  if (order.side === "buy") {
    const refund = remainingQty * order.price!;

    balances.USD!.locked -= refund;
    balances.USD!.available += refund;
  } else {
    const assetBalance = balances[order.symbol];

    if (!assetBalance) {
      throw new Error(`${order.symbol} balance not found`);
    }

    assetBalance.locked -= remainingQty;
    assetBalance.available += remainingQty;
  }

  order.status = "cancelled";

  return {
    orderId,
    status: "cancelled",
  };
}
