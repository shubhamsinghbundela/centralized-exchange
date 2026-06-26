import type { Prisma } from "../generated/prisma/client.ts";
import { FILLS } from "../store/exchange-store.ts";

export async function syncFills(tx: Prisma.TransactionClient) {
  const uniqueFills = [
    ...new Map(FILLS.map((fill) => [fill.fillId, fill])).values(),
  ];

  if (uniqueFills.length === 0) return;

  await tx.fill.createMany({
    data: uniqueFills.map((fill) => ({
      fillId: fill.fillId,
      symbol: fill.symbol,
      price: fill.price,
      qty: fill.qty,
      buyOrderId: fill.buyOrderId,
      sellOrderId: fill.sellOrderId,
      createdAt: new Date(fill.createdAt),
    })),
    skipDuplicates: true,
  });
}
