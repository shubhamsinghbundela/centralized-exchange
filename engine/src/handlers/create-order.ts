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
  // Input come like this below
  // {
  //   "type": "limit",
  //   "side": "buy",
  //   "symbol": "SOL",
  //   "price": 80,
  //   "qty": 5
  // }
  const input = payload as unknown as CreateOrderInput;

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
    //Example:
    // BUY 2 SOL @ $80
    //
    // Cost of 1 SOL = $80
    // Quantity       = 2
    //
    // Total required = 80 * 2 = $160
    const requiredAmount = input.price * input.qty;

    if (usdBalance.available < requiredAmount) {
      throw new Error("Insufficient USD balance");
    }

    // Move funds from available -> locked.
    // We lock $160 before placing the order so the user
    // cannot spend the same money elsewhere while this
    // order is waiting in the order book.
    usdBalance.available -= requiredAmount;
    usdBalance.locked += requiredAmount;
  } else {
    // Seller must own enough of the asset being sold.
    // Example:
    // User wants to sell 5 SOL.
    // Before accepting the order, we must verify that the user
    // actually has at least 5 SOL available in their wallet.
    //
    // We compare against quantity (input.qty) because the seller
    // is selling units of the asset (SOL), not USD.
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

  // ----------------------------------
  // Get Order Book
  // ----------------------------------

  const book = getOrderBook(input.symbol);

  // Quantity still waiting to be matched.
  let remainingQty = input.qty;

  // All fills generated during matching.
  const fills: Fill[] = [];

  // We always match against the opposite side of the order book.
  //
  // If a user wants to BUY, we must look at people who are SELLING (asks).
  // Example:
  //   You want to buy 2 SOL @ $80
  //   We search in asks to find sellers willing to sell.
  //
  // If a user wants to SELL, we must look at people who are BUYING (bids).
  // Example:
  //   You want to sell 2 SOL @ $80
  //   We search in bids to find buyers willing to buy.
  //
  const oppositeSide = input.side === "buy" ? book.asks : book.bids;

  // For BUY orders:
  // Match with the cheapest available sellers first.
  //
  // For SELL orders:
  // Match with the highest paying buyers first.
  //
  // This follows the "best price first" rule used by exchanges.
  const prices = [...oppositeSide.keys()].sort((a, b) =>
    input.side === "buy" ? a - b : b - a,
  );

  // ----------------------------------
  // No Liquidity Available
  // ----------------------------------

  // No liquidity exists on opposite side.
  //
  // Example:
  //
  // Shubham places:
  //
  // BUY 2 SOL @ $80
  //
  // Orderbook:
  //
  // bids: {}
  // asks: {}
  //
  // Nobody is selling.
  //
  // Therefore order cannot execute now.
  //
  // Place order into bids side and wait
  // for a future seller.

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

    ORDERS.set(orderId, order);

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
    // Respect the limit price of the incoming order.
    //
    // BUY example:
    //   Buyer places: BUY 2 SOL @ $80
    //   Available asks: $75, $80, $85
    //
    //   $75 match
    //   $80 match
    //   $85 too expensive
    //
    //   Stop checking further prices because asks are sorted
    //   from lowest to highest.
    if (input.side === "buy" && input.price !== null && price > input.price) {
      break;
    }

    // SELL example:
    //   Seller places: SELL 2 SOL @ $80
    //   Available bids: $85, $80, $75
    //
    //   $85 match
    //   $80 match
    //   $75 too cheap
    //
    //   Stop checking further prices because bids are sorted
    //   from highest to lowest.
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
      // Prevent self-trading.
      //
      // Example:
      //
      // Shubham places:
      //
      // BUY 2 SOL @ $80
      //
      // Later Shubham places:
      //
      // SELL 2 SOL @ $80
      //
      // Exchange should not match a user
      // against their own order.
      //
      // Skip this resting order and continue
      // searching for another counterparty.
      if (restingOrder.userId === input.userId) {
        continue;
      }
      if (remainingQty <= 0) {
        break;
      }

      // How much quantity is still available on the existing order.
      //
      // Example:
      //   Shubham placed BUY 5 SOL @ $80
      //
      //   qty = 5
      //   filledQty = 2
      //
      //   This means 2 SOL has already been matched,
      //   and 3 SOL is still waiting in the order book.
      //
      //   availableQty = 5 - 2 = 3
      const availableQty = restingOrder.qty - restingOrder.filledQty;

      if (availableQty <= 0) {
        continue;
      }

      // Determine actual trade quantity.
      //
      // Example:
      //
      // Incoming SELL = 5 SOL
      //
      // Resting BUY = 2 SOL
      //
      // Only 2 SOL can trade.
      //
      // matchedQty = min(5, 2)
      //
      // Result:
      //
      // 2 SOL traded
      // 3 SOL still waiting
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

      // Update the maker order record.
      //
      // The resting order in the order book and the
      // corresponding OrderRecord in ORDERS must stay
      // synchronized after every trade execution.
      //
      // Otherwise order history and order status APIs
      // may show stale data.
      const makerOrder = ORDERS.get(restingOrder.orderId);

      if (makerOrder) {
        // Update maker order record stored in ORDERS.
        //
        // RestingOrder is used by the matching engine.
        // OrderRecord is used by APIs, order history,
        // open orders and filled orders screens.

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
        // ----------------------------------
        // Incoming order is BUY (Taker)
        //
        // Example:
        //
        // Shubham places BUY 2 SOL @ $80
        //
        // Ankit already has SELL 5 SOL @ $80
        // sitting in the order book.
        //
        // Trade executed:
        //
        // 2 SOL @ $80
        //
        // Now we must:
        //
        // 1. Give 2 SOL to Shubham
        // 2. Take $160 from Shubham's locked USD
        // 3. Remove 2 SOL from Ankit's locked SOL
        // 4. Give $160 to Ankit
        // ----------------------------------

        const buyerStock = getBalance(input.userId, input.symbol);

        const buyerUsd = getBalance(input.userId, "USD");

        const sellerStock = getBalance(restingOrder.userId, input.symbol);

        const sellerUsd = getBalance(restingOrder.userId, "USD");

        // Buyer receives the purchased SOL.
        buyerStock.available += matchedQty;

        // USD was already locked when BUY order was placed.
        // Remove only the amount that was actually spent.
        buyerUsd.locked -= matchedQty * price;

        // Seller delivers SOL from locked balance.
        sellerStock.locked -= matchedQty;

        // Seller receives payment in USD.
        sellerUsd.available += matchedQty * price;
      } else {
        // ----------------------------------
        // Incoming order is SELL (Taker)
        //
        // Example:
        //
        // Shubham already has BUY 2 SOL @ $80
        // in the order book.
        //
        // Ankit places SELL 5 SOL @ $80
        //
        // Trade executed:
        //
        // 2 SOL @ $80
        //
        // Now we must:
        //
        // 1. Remove 2 SOL from Ankit's locked SOL
        // 2. Give $160 to Ankit
        // 3. Take $160 from Shubham's locked USD
        // 4. Give 2 SOL to Shubham
        // ----------------------------------

        const sellerUsd = getBalance(input.userId, "USD");

        const sellerStock = getBalance(input.userId, input.symbol);

        const buyerStock = getBalance(restingOrder.userId, input.symbol);

        const buyerUsd = getBalance(restingOrder.userId, "USD");

        // Seller delivers SOL from locked balance
        sellerStock.locked -= matchedQty;

        // Seller receives payment.
        sellerUsd.available += matchedQty * price;

        // Buyer pays using priviously locked USD
        buyerUsd.locked -= matchedQty * price;

        // Buyer receives purchased SOL
        buyerStock.available += matchedQty;
      }

      // After matching, some resting orders may be fully executed.
      //
      // Example:
      //
      // Before:
      //
      // bids:
      // 80 => [
      //   { qty: 2, filledQty: 2, status: "filled" },
      //   { qty: 5, filledQty: 1, status: "partially_filled" }
      // ]
      //
      // The first order is completely finished and should
      // no longer remain in the order book.
      //
      // Keep only orders that are still open or partially filled.
      oppositeSide.set(
        price,
        restingOrders.filter((o) => o.status !== "filled"),
      );

      // Example:
      //
      // After filtering:
      //
      // bids:
      // 80 => [
      //   { qty: 5, filledQty: 1, status: "partially_filled" }
      // ]
      //
      // If no orders remain at this price level:
      //
      // bids:
      // 80 => []
      //
      // then remove the entire price level from the order book.
      //
      // Result:
      //
      // bids: Map {}
      //
      // This keeps the order book clean and prevents
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

  // After matching against all available opposite-side orders,
  // there may still be some quantity left unfilled.
  //
  // Example:
  //
  // Existing Order Book:
  //
  // SELL 2 SOL @ $80
  //
  // Incoming Order:
  //
  // BUY 5 SOL @ $80
  //
  // Matching Result:
  //
  // 2 SOL traded
  // 3 SOL still waiting
  //
  // Since the buyer still wants 3 more SOL,
  // the remaining quantity must stay in the order book
  // and wait for future sellers.
  //
  // This remaining quantity becomes a resting (maker) order.
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

  return {
    orderId,
    status: order.status,
    filledQty: order.filledQty,
    remainingQty,
    fills,
  };
}
