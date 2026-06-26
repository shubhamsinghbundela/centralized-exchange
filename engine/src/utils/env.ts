import "dotenv/config";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable: ${name}`);
  return value;
}

export const env = {
  redisUrl: readRequiredEnv("REDIS_URL"),
  incomingQueue: process.env.INCOMING_QUEUE ?? "backend-to-engine-broker",
  marketCloseTime: process.env.MARKET_CLOSE_CRON ?? "30 15 * * 1-5",
  marketTimezone: process.env.MARKET_TIMEZONE ?? "Asia/Kolkata",
};
