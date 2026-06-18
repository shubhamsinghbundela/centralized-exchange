import { ORDERS } from "../store/exchange-store";

export function getOrder(userId: string, orderId: string) {
  const order = ORDERS.get(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    throw new Error("Order not found");
  }

  return order;
}
