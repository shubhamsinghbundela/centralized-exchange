import { Prisma } from "../generated/prisma/client.ts";
import { ORDERS } from "../store/exchange-store.ts";

export async function syncOrders(tx: Prisma.TransactionClient) {
  const orders = [...ORDERS.values()];

  if (orders.length === 0) return;

  await tx.order.createMany({
    data: orders.map((order) => ({
      orderId: order.orderId,
      userId: order.userId,
      side: order.side,
      type: order.type,
      symbol: order.symbol,
      price: order.price,
      qty: order.qty,
      filledQty: order.filledQty,
      status: order.status,
      createdAt: new Date(order.createdAt),
    })),
    skipDuplicates: true,
  });
}
