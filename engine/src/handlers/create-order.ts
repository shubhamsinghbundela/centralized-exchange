import {
  FILLS,
  ORDERBOOKS,
  ORDERS,
  type CreateOrderInput,
  type Fill,
  type OrderRecord,
  type RestingOrder,
} from "../store/exchange-store.js";
import { getBalance } from "./getBalance.js";
import { getOrderBook } from "./getOrderBook.js";

export function handleCreateOrder(payload: Record<string, unknown>) {
  const input = payload as unknown as CreateOrderInput;

  if (input.price === null) {
    throw new Error("Price is required for limit orders");
  }

  // ----------------------------------
  // Validate + Lock Balance
  // ----------------------------------

  if (input.side === "buy") {
    const usdBalance = getBalance(input.userId, "USD");

    const requiredAmount = input.price * input.qty;

    if (usdBalance.available < requiredAmount) {
      throw new Error("Insufficient USD balance");
    }

    usdBalance.available -= requiredAmount;
    usdBalance.locked += requiredAmount;
  } else {
    const assetBalance = getBalance(input.userId, input.symbol);

    if (assetBalance.available < input.qty) {
      throw new Error(`Insufficient ${input.symbol} balance`);
    }

    assetBalance.available -= input.qty;
    assetBalance.locked += input.qty;
  }

  // ----------------------------------
  // Create Order Record
  // ----------------------------------

  const orderId = crypto.randomUUID();

  const order: OrderRecord = {
    orderId,
    userId: input.userId,
    side: input.side,
    type: input.type,
    symbol: input.symbol,
    price: input.price,
    qty: input.qty,
    filledQty: 0,
    status: "open",
    fills: [],
    createdAt: Date.now(),
  };

  ORDERS.set(orderId, order);

  // ----------------------------------
  // Get OrderBook
  // ----------------------------------

  const book = getOrderBook(input.symbol);

  let remainingQty = input.qty;

  const fills: Fill[] = [];

  // BUY => match against asks
  const oppositeSide = input.side === "buy" ? book.asks : book.bids;

  // sort prices
  const prices = [...oppositeSide.keys()].sort(
    (a, b) =>
      input.side === "buy"
        ? a - b // lowest ask first
        : b - a, // highest bid first
  );

  // -----------------------------
  // No Liquidity Available
  // -----------------------------

  if (prices.length === 0) {
    const restingOrder: RestingOrder = {
      orderId,
      userId: input.userId,
      side: input.side,
      type: "limit",
      symbol: input.symbol,
      price: input.price!,
      qty: input.qty,
      filledQty: 0,
      status: "open",
      createdAt: Date.now(),
    };

    const sameSideMap = input.side === "buy" ? book.bids : book.asks;

    const level = sameSideMap.get(input.price!) ?? [];

    level.push(restingOrder);

    sameSideMap.set(input.price!, level);

    return {
      orderId,
      status: "open",
      filledQty: 0,
      remainingQty,
      message: "No matching orders found. Added to order book.",
    };
  }

  // ----------------------------------
  // Match Against Opposite Side
  // ----------------------------------

  for (const price of prices) {
    // BUY orders can only match asks priced at or below the buyer's limit price.
    // If the ask price is higher than what the buyer is willing to pay,
    // stop searching because prices are sorted from lowest to highest.
    if (input.side === "buy" && input.price !== null && price > input.price) {
      break;
    }

    // SELL orders can only match bids priced at or above the seller's limit price.
    // If the bid price is lower than what the seller is willing to accept,
    // stop searching because prices are sorted from highest to lowest.
    if (input.side === "sell" && input.price !== null && price < input.price) {
      break;
    }

    // ORDERBOOK {
    //   bids: Map(2) {
    //     80: [
    //       [Object ...], [Object ...]
    //     ],
    //     81: [
    //       [Object ...]
    //     ],
    //   },
    //   asks: Map {},
    // }

    // Suppose price = 80 then restingOrders = 80 : [[Object ...], [Object ...]]
    const restingOrders = oppositeSide.get(price);

    if (!restingOrders) {
      continue;
    }

    for (const restingOrder of restingOrders) {
      if (remainingQty <= 0) {
        break;
      }

      // availableQty = 5
      const availableQty = restingOrder.qty - restingOrder.filledQty;

      if (availableQty <= 0) {
        continue;
      }

      // remainingQty = 1, availableQty = 5
      // matchedQty = 1
      const matchedQty = Math.min(remainingQty, availableQty);

      // remainingQty = 0
      remainingQty -= matchedQty;

      // restingOrder.filledQty = 1 i.e. 80dollar ma 5 sol buy krna tha
      // toh koi sell krna aaya 80 dollar ma 1 sol ko toh mai 1 sol buy krh liya
      restingOrder.filledQty += matchedQty;

      restingOrder.status =
        restingOrder.filledQty === restingOrder.qty
          ? "filled"
          : "partially_filled";

      const fill: Fill = {
        fillId: crypto.randomUUID(),
        symbol: input.symbol,
        price,
        qty: matchedQty,
        buyOrderId: input.side === "buy" ? orderId : restingOrder.orderId,
        sellOrderId: input.side === "sell" ? orderId : restingOrder.orderId,
        createdAt: Date.now(),
      };

      fills.push(fill);
      FILLS.push(fill);

      // -----------------------------
      // Balance Settlement
      // -----------------------------

      if (input.side === "buy") {
      } else {
        //mai sell krna aaya hu abhi toh
        const sellerUsd = getBalance(input.userId, "USD");

        const buyerStock = getBalance(restingOrder.userId, input.symbol);

        const buyerUsd = getBalance(restingOrder.userId, "USD");

        sellerUsd.available += matchedQty * price;

        buyerUsd.locked -= matchedQty * price;

        buyerStock.available += matchedQty;
      }

      // remove filled orders
      oppositeSide.set(
        price,
        restingOrders.filter((o) => o.status !== "filled"),
      );

      if (oppositeSide.get(price)?.length === 0) {
        oppositeSide.delete(price);
      }

      if (remainingQty <= 0) {
        break;
      }
    }

    // ----------------------------------
    // 4. Remaining Qty -> OrderBook
    // ----------------------------------

    if (remainingQty > 0 && input.type === "limit") {
    }
  }

  // ----------------------------------
  // 5. Store Order
  // ----------------------------------

  order.filledQty = input.qty - remainingQty;

  order.status =
    remainingQty === 0
      ? "filled"
      : remainingQty === input.qty
        ? "open"
        : "partially_filled";

  order.fills = fills;

  ORDERS.set(orderId, order);

  return {
    orderId,
    status: order.status,
    filledQty: order.filledQty,
    remainingQty,
    fills,
  };
}
