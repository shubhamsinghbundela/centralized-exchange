import axios from "axios";

type Orderbook = {
  bids: Record<string, string>;
  asks: Record<string, string>;
};

const orderbook: Orderbook = {
  bids: {},
  asks: {},
};
let orderbookInitialised = false;
const ws = new WebSocket("ws://localhost:8080");

const buffer: {
  updatedBids: [string, string][];
  updatedAsks: [string, string][];
  startOffset: number;
  endOffset: number;
}[] = [];

function updateOrderbook(
  updatedAsks: [string, string][],
  updatedBids: [string, string][],
) {
  updatedAsks.forEach(([price, qty]) => {
    if (qty === "0") {
      delete orderbook.asks[price];
    } else {
      orderbook.asks[price] = qty;
    }
  });

  updatedBids.forEach(([price, qty]) => {
    if (qty === "0") {
      delete orderbook.bids[price];
    } else {
      orderbook.bids[price] = qty;
    }
  });
}

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      method: "SUBSCRIBE",
      params: ["depth.BTC"],
      id: 1,
    }),
  );
};

ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  // Subscription acknowledged by the server
  if ("result" in message && message.id === 1) {
    console.log("Subscribed successfully");

    const res = await axios.get("http://localhost:3000/depth/BTC");

    const { bids, asks, lastUpdateId } = res.data;

    bids.forEach(([price, qty]: [string, string]) => {
      orderbook.bids[price] = qty;
    });

    asks.forEach(([price, qty]: [string, string]) => {
      orderbook.asks[price] = qty;
    });

    orderbookInitialised = true;

    let expected = lastUpdateId + 1;

    buffer.forEach((msg) => {
      if (msg.endOffset < expected) {
        return;
      }

      if (msg.startOffset > expected) {
        throw new Error("Sequence gap detected. Need resync.");
      }

      updateOrderbook(msg.updatedAsks, msg.updatedBids);

      expected = msg.endOffset + 1;
    });

    buffer.length = 0;

    console.log("Orderbook initialized");

    return;
  }

  // Actual depth update
  const updatedBids = message.b;
  const updatedAsks = message.a;
  const startOffset = message.U;
  const endOffset = message.u;

  if (!orderbookInitialised) {
    buffer.push({
      updatedAsks,
      updatedBids,
      startOffset,
      endOffset,
    });
  } else {
    updateOrderbook(updatedAsks, updatedBids);
  }
};

setInterval(() => {
  const bestBid = Object.keys(orderbook.bids).sort(
    (a, b) => Number(b) - Number(a),
  );

  const bestAsk = Object.keys(orderbook.asks).sort(
    (a, b) => Number(a) - Number(b),
  );

  console.clear();

  console.log("Best Bid:", bestBid);
  console.log("Best Ask:", bestAsk);
}, 1000);
