import {
  FILLS,
  type CreateOrderInput,
  type Fill,
} from "../../store/exchange-store";
import { getOrderBook } from "../../utils/getOrderBook";
import { createFill } from "../shared/createFill";
import { removeFilledOrders } from "../shared/removeFilledOrders";
import { updateMakerOrder } from "../shared/updateMakerOrder";
import { settleMarketTrade } from "./settleMarketTrade";

export function matchMarketOrder(input: CreateOrderInput) {
  const book = getOrderBook(input.symbol);

  let remainingQty = input.qty;

  let totalTradedValue = 0;
  let totalFilledQty = 0;

  const fills: Fill[] = [];

  const oppositeSide = input.side === "buy" ? book.asks : book.bids;

  const prices = [...oppositeSide.keys()].sort((a, b) =>
    input.side === "buy" ? a - b : b - a,
  );

  for (const price of prices) {
    const restingOrders = oppositeSide.get(price);

    if (!restingOrders) {
      continue;
    }

    for (const restingOrder of restingOrders) {
      if (remainingQty <= 0) {
        break;
      }

      if (restingOrder.userId === input.userId) {
        continue;
      }

      const availableQty = restingOrder.qty - restingOrder.filledQty;

      if (availableQty <= 0) {
        continue;
      }

      const matchedQty = Math.min(remainingQty, availableQty);

      remainingQty -= matchedQty;

      totalFilledQty += matchedQty;
      totalTradedValue += matchedQty * price;

      restingOrder.filledQty += matchedQty;

      restingOrder.status =
        restingOrder.filledQty === restingOrder.qty
          ? "filled"
          : "partially_filled";

      const fill = createFill({
        input,
        orderId: crypto.randomUUID(),
        restingOrder,
        price,
        matchedQty,
      });

      fills.push(fill);
      FILLS.push(fill);

      updateMakerOrder({
        orderId: restingOrder.orderId,
        matchedQty,
        fill,
      });

      settleMarketTrade({
        input,
        restingOrder,
        matchedQty,
        price,
      });

      removeFilledOrders({
        side: oppositeSide,
        price,
        restingOrders,
      });
    }

    if (remainingQty <= 0) {
      break;
    }
  }

  return {
    remainingQty,
    fills,
    averagePrice: totalFilledQty > 0 ? totalTradedValue / totalFilledQty : null,
  };
}
