import { prisma } from "../db.ts";
import { syncOrders } from "./syncOrders.js";
import { syncFills } from "./syncFills.js";

export async function handleMarketClose() {
  console.log("Market closed");

  await syncOrders(prisma);
  await syncFills(prisma);

  console.log("Market data synced successfully");
}
