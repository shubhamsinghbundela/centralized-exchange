import {
  BALANCES,
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

  // ----------------------------------
  // Validate Input
  // ----------------------------------

  // Limit orders must always have a price.
  if (input.price === null) {
    throw new Error("Price is required for limit orders");
  }

  // ----------------------------------
  // Validate + Lock Balance
  // ----------------------------------

  if (input.side === "buy") {
    // Buyer pays using USD.
    const usdBalance = getBalance(input.userId, "USD");

    // Total amount needed to place this order.
    const requiredAmount = input.price * input.qty;

    if (usdBalance.available < requiredAmount) {
      throw new Error("Insufficient USD balance");
    }

    // Move funds from available -> locked.
    // This prevents double spending while the order is active.
    usdBalance.available -= requiredAmount;
    usdBalance.locked += requiredAmount;
  } else {
    // Seller must own enough of the asset being sold.
    const assetBalance = getBalance(input.userId, input.symbol);

    if (assetBalance.available < input.qty) {
      throw new Error(`Insufficient ${input.symbol} balance`);
    }

    // Lock the asset so it cannot be sold twice.
    assetBalance.available -= input.qty;
    assetBalance.locked += input.qty;
  }

  // ----------------------------------
  // Create Order Record
  // ----------------------------------

  const orderId = crypto.randomUUID();

  // Store order immediately so it can be queried later.
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
  // Get Order Book
  // ----------------------------------

  const book = getOrderBook(input.symbol);

  // Quantity still waiting to be matched.
  let remainingQty = input.qty;

  // All fills generated during matching.
  const fills: Fill[] = [];

  // Buy orders match against asks.
  // Sell orders match against bids.
  const oppositeSide = input.side === "buy" ? book.asks : book.bids;

  // Sort price levels.
  // Buy => lowest ask first.
  // Sell => highest bid first.
  const prices = [...oppositeSide.keys()].sort((a, b) =>
    input.side === "buy" ? a - b : b - a,
  );

  // ----------------------------------
  // No Liquidity Available
  // ----------------------------------

  if (prices.length === 0) {
    // No opposite-side orders exist.
    // Current order becomes a resting maker order.

    const restingOrder: RestingOrder = {
      orderId,
      userId: input.userId,
      side: input.side,
      type: "limit",
      symbol: input.symbol,
      price: input.price,
      qty: input.qty,
      filledQty: 0,
      status: "open",
      createdAt: Date.now(),
    };

    const sameSideMap = input.side === "buy" ? book.bids : book.asks;

    const level = sameSideMap.get(input.price) ?? [];

    level.push(restingOrder);

    sameSideMap.set(input.price, level);

    console.log("ORDERBOOKS", ORDERBOOKS);
    console.log("ORDERS", ORDERS);
    console.log("BALANCES", BALANCES);

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
    // Buyer will not pay more than limit price.
    if (input.side === "buy" && input.price !== null && price > input.price) {
      break;
    }

    // Seller will not accept less than limit price.
    if (input.side === "sell" && input.price !== null && price < input.price) {
      break;
    }

    // All resting orders at this price level.
    const restingOrders = oppositeSide.get(price);

    if (!restingOrders) {
      continue;
    }

    // FIFO matching inside the same price level.
    for (const restingOrder of restingOrders) {
      if (restingOrder.userId === input.userId) {
        continue;
      }
      if (remainingQty <= 0) {
        break;
      }

      // Unfilled quantity remaining on maker order.
      const availableQty = restingOrder.qty - restingOrder.filledQty;

      if (availableQty <= 0) {
        continue;
      }

      // Trade quantity is the minimum of:
      // - what taker still wants
      // - what maker still has available
      const matchedQty = Math.min(remainingQty, availableQty);

      // Reduce remaining quantity of incoming order.
      remainingQty -= matchedQty;

      // Increase filled quantity of resting order.
      restingOrder.filledQty += matchedQty;

      // Update maker order status.
      restingOrder.status =
        restingOrder.filledQty === restingOrder.qty
          ? "filled"
          : "partially_filled";

      // Create trade execution record.
      const fill: Fill = {
        fillId: crypto.randomUUID(),
        symbol: input.symbol,
        price,
        qty: matchedQty,
        buyOrderId: input.side === "buy" ? orderId : restingOrder.orderId,
        sellOrderId: input.side === "sell" ? orderId : restingOrder.orderId,
        createdAt: Date.now(),
      };

      //This is the list of fills for the current order only.
      fills.push(fill);

      // --------------------------------//
      //FILLS is your global trade history.
      //Every trade executed on the exchange gets stored here.
      // This is useful for:
      // Recent trades
      // Trade history
      // Candlestick generation
      // Market data
      // Volume calculations
      //----------------------------------//
      FILLS.push(fill);

      const makerOrder = ORDERS.get(restingOrder.orderId);

      if (makerOrder) {
        makerOrder.filledQty += matchedQty;

        makerOrder.status =
          makerOrder.filledQty === makerOrder.qty
            ? "filled"
            : "partially_filled";

        makerOrder.fills.push(fill);
      }

      // ----------------------------------
      // Balance Settlement
      // ----------------------------------

      if (input.side === "buy") {
        // Incoming order is BUY.
        // Seller was already resting on the book.

        const buyerStock = getBalance(input.userId, input.symbol);

        const buyerUsd = getBalance(input.userId, "USD");

        const sellerStock = getBalance(restingOrder.userId, input.symbol);

        const sellerUsd = getBalance(restingOrder.userId, "USD");

        // Buyer receives asset.
        buyerStock.available += matchedQty;

        // Release spent USD from buyer's locked balance.
        buyerUsd.locked -= matchedQty * price;

        // Seller delivers locked asset.
        sellerStock.locked -= matchedQty;

        // Seller receives USD.
        sellerUsd.available += matchedQty * price;
      } else {
        // Incoming order is SELL.
        // Buyer was already resting on the book.

        const sellerUsd = getBalance(input.userId, "USD");

        const sellerStock = getBalance(input.userId, input.symbol);

        const buyerStock = getBalance(restingOrder.userId, input.symbol);

        const buyerUsd = getBalance(restingOrder.userId, "USD");

        // Seller delivers locked asset.
        sellerStock.locked -= matchedQty;

        // Seller receives USD.
        sellerUsd.available += matchedQty * price;

        // Buyer spends locked USD.
        buyerUsd.locked -= matchedQty * price;

        // Buyer receives asset.
        buyerStock.available += matchedQty;
      }

      // Remove completely filled maker orders later.
      oppositeSide.set(
        price,
        restingOrders.filter((o) => o.status !== "filled"),
      );

      // Remove empty price levels.
      if (oppositeSide.get(price)?.length === 0) {
        oppositeSide.delete(price);
      }

      if (remainingQty <= 0) {
        break;
      }
    }
  }

  // ----------------------------------
  // Remaining Quantity -> Order Book
  // ----------------------------------

  // If some quantity is still unfilled,
  // place the remaining order onto the book.
  if (remainingQty > 0 && input.type === "limit") {
    const restingOrder: RestingOrder = {
      orderId,
      userId: input.userId,
      side: input.side,
      type: "limit",
      symbol: input.symbol,
      price: input.price!,
      qty: input.qty,
      filledQty: input.qty - remainingQty,
      status: remainingQty === input.qty ? "open" : "partially_filled",
      createdAt: Date.now(),
    };

    const sideMap = input.side === "buy" ? book.bids : book.asks;

    const level = sideMap.get(input.price!) ?? [];

    level.push(restingOrder);

    sideMap.set(input.price!, level);
  }

  // ----------------------------------
  // Update Order Record
  // ----------------------------------

  // Total quantity executed.
  order.filledQty = input.qty - remainingQty;

  // Final order status.
  order.status =
    remainingQty === 0
      ? "filled"
      : remainingQty === input.qty
        ? "open"
        : "partially_filled";

  // Attach generated fills.
  order.fills = fills;

  // Persist latest order state.
  ORDERS.set(orderId, order);

  console.log("ORDERBOOKS", ORDERBOOKS);
  console.log("ORDERS", ORDERS);
  console.log("BALANCES", BALANCES);

  return {
    orderId,
    status: order.status,
    filledQty: order.filledQty,
    remainingQty,
    fills,
  };
}
