import { prisma } from "../db.js";
import { syncOrders } from "./syncOrders.js";
import { syncFills } from "./syncFills.js";

export async function handleMarketClose() {
  console.log("Market closed");

  await prisma.$transaction(async (tx) => {
    await syncOrders(tx);
    await syncFills(tx);
  });

  console.log("Market data synced successfully");
}
