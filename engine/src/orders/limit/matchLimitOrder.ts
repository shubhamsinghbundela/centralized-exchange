import {
  FILLS,
  type CreateOrderInput,
  type Fill,
} from "../../store/exchange-store";
import { getOrderBook } from "../../utils/getOrderBook";
import { createFill } from "../shared/createFill";
import { removeFilledOrders } from "../shared/removeFilledOrders";
import { settleLimitTrade } from "./settleLimitTrade";
import { updateMakerOrder } from "../shared/updateMakerOrder";
import Decimal from "decimal.js";

/**
 * Match an incoming limit order against
 * existing orders on the opposite side
 * of the order book.
 */
export function matchLimitOrder({
  input,
  orderId,
}: {
  input: CreateOrderInput;
  orderId: string;
}) {
  let totalTradedValue = new Decimal(0);
  let totalFilledQty = new Decimal(0);
  // Get Order Book
  const book = getOrderBook(input.symbol);

  // Quantity still waiting to be matched.
  let remainingQty = input.qty;

  // All fills generated during matching.
  const fills: Fill[] = [];

  // We always match against the opposite side of the order book.
  const oppositeSide = input.side === "buy" ? book.asks : book.bids;

  // Match best available prices first.
  // For BUY orders: Match with the cheapest available sellers first.
  // For SELL orders: Match with the highest paying buyers first.
  const prices = [...oppositeSide.keys()].sort((a, b) =>
    input.side === "buy" ? a - b : b - a,
  );

  for (const price of prices) {
    // A buyer should never pay more than their limit price
    if (input.side === "buy" && input.price !== null && price > input.price) {
      break;
    }

    // A seller should never sell below their limit price.
    if (input.side === "sell" && input.price !== null && price < input.price) {
      break;
    }

    // All resting orders at this price level.
    const restingOrders = oppositeSide.get(price);

    if (!restingOrders) {
      continue;
    }

    for (const restingOrder of restingOrders) {
      if (remainingQty <= 0) {
        break;
      }

      // Prevent self-trading
      // Exchange should not match a user against their own order.
      if (restingOrder.userId === input.userId) {
        continue;
      }

      // How much quantity is still available on the existing resting order.
      const availableQty = restingOrder.qty - restingOrder.filledQty;

      if (availableQty <= 0) {
        continue;
      }

      const matchedQty = Math.min(remainingQty, availableQty);

      // Reduce remaining quantity of incoming order.
      remainingQty -= matchedQty;

      // Increase filled quantity of resting order.
      restingOrder.filledQty += matchedQty;

      // Update order book maker order status.
      restingOrder.status =
        restingOrder.filledQty === restingOrder.qty
          ? "filled"
          : "partially_filled";

      // create match record
      const fill = createFill({
        input,
        orderId,
        restingOrder,
        price,
        matchedQty,
      });

      //This is the list of fills for the current incoming order only.
      fills.push(fill);

      //FILLS is your global trade history.
      //Every trade executed on the exchange gets stored here.
      // This is useful for:
      // Recent trades
      // Trade history
      FILLS.push(fill);

      // Update the order book match maker order record.
      updateMakerOrder({
        orderId: restingOrder.orderId,
        matchedQty,
        fill,
      });

      totalTradedValue = totalTradedValue.plus(
        new Decimal(matchedQty).mul(price),
      );
      totalFilledQty = totalFilledQty.plus(matchedQty);

      // Balance Settlement after match
      settleLimitTrade({
        input,
        restingOrder,
        matchedQty,
        price,
      });

      // Clean Order Book
      removeFilledOrders({
        side: oppositeSide,
        price,
        restingOrders,
      });
    }
  }

  return {
    remainingQty,
    fills,
    averagePrice: totalFilledQty.gt(0)
      ? totalTradedValue.div(totalFilledQty).toNumber()
      : null,
  };
}
