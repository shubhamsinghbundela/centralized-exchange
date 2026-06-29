import { WebSocket, WebSocketServer } from "ws";
import { createClient } from "redis";

const STREAM = "depth-stream";

// Every websocket server has its own group
const GROUP = process.env.CONSUMER_GROUP!;
const CONSUMER = crypto.randomUUID();

const redis = createClient({ url: process.env.REDIS_URL }).on(
  "error",
  (error) => {
    console.error("Redis Stream client error", error);
  },
);

await redis.connect();

//creates a consumer group in Redis Streams.
//A consumer group can only be created once.
try {
  // startId options:
  // '$' - only new messages from this point forward
  // '0' - read all existing messages from the beginning
  // '1234567890123-0' - specific message ID
  // MKSTREAM - If depth-stream doesn't exist, create it first, then create the consumer group.
  await redis.xGroupCreate(STREAM, GROUP, "0", {
    MKSTREAM: true,
  });
} catch (error) {
  // BUSYGROUP means the group already exists
  if (error instanceof Error && error.message.includes("BUSYGROUP")) {
    console.log(`Group "${GROUP}" already exists`);
  } else {
    throw error;
  }
}

/**
 * Stores all active websocket subscriptions.
 *
 * Example:
 * {
 *   "depth.BTC": Set(ws1, ws2),
 *   "depth.ETH": Set(ws3)
 * }
 *
 * When a new depth update for BTC arrives,
 * only the sockets inside activeSubscriptions["depth.BTC"]
 * will receive the update.
 */
const activeSubscriptions: Record<string, Set<WebSocket>> = {};

const wss = new WebSocketServer({
  port: 8080,
});

console.log("WS Server Started");

poll();

async function poll() {
  while (true) {
    // Reading Messages with XREADGROUP
    // Engine -> XADD -> depth-stream -> xReadGroup()
    const result = await redis.xReadGroup(
      GROUP, // I'm reading as consumer group ws-server-1
      CONSUMER, // Inside a consumer group there can be multiple consumers.
      [
        {
          key: STREAM,
          id: ">", // The ">" ID means: give me messages never delivered to any consumer
        },
      ],
      {
        BLOCK: 0, // Wait forever until a message arrives.
        COUNT: 100, // Maximum messages to return at once.
      },
    );

    if (!result) continue;

    for (const stream of result) {
      for (const message of stream.messages) {
        const depth = JSON.parse(message.message.payload);

        const key = `depth.${depth.s}`;

        activeSubscriptions[key]?.forEach((ws) => {
          ws.send(JSON.stringify(depth));
        });

        await redis.xAck(STREAM, GROUP, message.id);
      }
    }
  }
}

wss.on("connection", (ws) => {
  console.log("Client Connected");

  ws.on("message", (data) => {
    const parsed = JSON.parse(data.toString());

    /**
     * {
     *   method:"SUBSCRIBE",
     *   params:["depth.BTC"],
     *   id:1
     * }
     */

    if (parsed.method === "SUBSCRIBE") {
      parsed.params.forEach((channel: string) => {
        // Create a subscription bucket if this is the
        // first client subscribing to the channel.
        if (!activeSubscriptions[channel]) {
          activeSubscriptions[channel] = new Set();
        }

        // Register this websocket connection
        // for the requested channel.
        activeSubscriptions[channel].add(ws);
      });

      // Acknowledge successful subscription.
      ws.send(
        JSON.stringify({
          id: parsed.id,
          result: null,
        }),
      );
    }

    if (parsed.method === "UNSUBSCRIBE") {
      parsed.params.forEach((channel: string) => {
        activeSubscriptions[channel]?.delete(ws);
      });

      // Acknowledge successful unsubscription.
      ws.send(
        JSON.stringify({
          id: parsed.id,
          result: null,
        }),
      );
    }
  });

  ws.on("close", () => {
    // Remove the socket from every subscribed channel
    Object.values(activeSubscriptions).forEach((clients) => clients.delete(ws));
  });
});
