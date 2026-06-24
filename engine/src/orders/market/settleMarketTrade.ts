import Decimal from "decimal.js";
import type {
  CreateOrderInput,
  RestingOrder,
} from "../../store/exchange-store";
import { getBalance } from "../../utils/getBalance";

export function settleMarketTrade({
  input,
  restingOrder,
  matchedQty,
  price,
}: {
  input: CreateOrderInput;
  restingOrder: RestingOrder;
  matchedQty: number;
  price: number;
}) {
  const tradeValue = new Decimal(matchedQty).mul(price);

  if (input.side === "buy") {
    const buyerStock = getBalance(input.userId, input.symbol);
    const buyerUsd = getBalance(input.userId, "USD");

    const sellerStock = getBalance(restingOrder.userId, input.symbol);
    const sellerUsd = getBalance(restingOrder.userId, "USD");

    buyerStock.available = buyerStock.available.plus(matchedQty);

    buyerUsd.available = buyerUsd.available.minus(tradeValue);

    sellerStock.locked = sellerStock.locked.minus(matchedQty);

    sellerUsd.available = sellerUsd.available.plus(tradeValue);
  } else {
    const sellerUsd = getBalance(input.userId, "USD");
    const sellerStock = getBalance(input.userId, input.symbol);

    const buyerStock = getBalance(restingOrder.userId, input.symbol);
    const buyerUsd = getBalance(restingOrder.userId, "USD");

    sellerStock.available = sellerStock.available.minus(matchedQty);

    sellerUsd.available = sellerUsd.available.plus(tradeValue);

    buyerUsd.locked = buyerUsd.locked.minus(tradeValue);

    buyerStock.available = buyerStock.available.plus(matchedQty);
  }
}
