import cron from "node-cron";
import { handleMarketClose } from "../sync/handleMarketClose.js";
import { env } from "../utils/env.js";

cron.schedule(
  env.marketCloseTime,
  async () => {
    console.log("Market closed. Starting sync...");

    try {
      await handleMarketClose();
    } catch (error) {
      console.error(error);
    }
  },
  {
    timezone: env.marketTimezone,
  },
);

console.log("Market cron started");
