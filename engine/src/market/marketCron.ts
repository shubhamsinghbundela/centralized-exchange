import cron from "node-cron";
import { handleMarketClose } from "../sync/handleMarketClose.js";

cron.schedule(
  "30 15 * * 1-5",
  async () => {
    console.log("Market closed. Starting sync...");

    try {
      await handleMarketClose();
    } catch (error) {
      console.error(error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  },
);

console.log("Market cron started");
