import type {
  CreateOrderInput,
  RestingOrder,
} from "../../store/exchange-store";
import { getBalance } from "../../utils/getBalance";

export function settleLimitTrade({
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
  if (input.side === "buy") {
    const buyerStock = getBalance(input.userId, input.symbol);
    const buyerUsd = getBalance(input.userId, "USD");

    const sellerStock = getBalance(restingOrder.userId, input.symbol);
    const sellerUsd = getBalance(restingOrder.userId, "USD");

    buyerStock.available += matchedQty;
    buyerUsd.locked -= matchedQty * price;

    sellerStock.locked -= matchedQty;
    sellerUsd.available += matchedQty * price;
  } else {
    const sellerUsd = getBalance(input.userId, "USD");
    const sellerStock = getBalance(input.userId, input.symbol);

    const buyerStock = getBalance(restingOrder.userId, input.symbol);
    const buyerUsd = getBalance(restingOrder.userId, "USD");

    sellerStock.locked -= matchedQty;
    sellerUsd.available += matchedQty * price;

    buyerUsd.locked -= matchedQty * price;
    buyerStock.available += matchedQty;
  }
}
