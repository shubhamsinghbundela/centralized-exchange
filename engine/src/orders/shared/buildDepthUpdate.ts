import { ENGINE_STATE, type DepthDelta } from "../../store/exchange-store";
import { getOrderBook } from "../../utils/getOrderBook";

export function buildDepthUpdate(symbol: string, depthDelta: DepthDelta) {
  const book = getOrderBook(symbol);

  const bids = [...depthDelta.bids].map((price) => {
    const orders = book.bids.get(price) ?? [];

    const qty = orders.reduce(
      (sum, order) => sum + (order.qty - order.filledQty),
      0,
    );

    return [price.toString(), qty.toString()] as [string, string];
  });

  const asks = [...depthDelta.asks].map((price) => {
    const orders = book.asks.get(price) ?? [];

    const qty = orders.reduce(
      (sum, order) => sum + (order.qty - order.filledQty),
      0,
    );

    return [price.toString(), qty.toString()] as [string, string];
  });

  const updateId = ++ENGINE_STATE.lastUpdateId;

  return {
    s: symbol,
    b: bids,
    a: asks,
    U: updateId,
    u: updateId,
    T: Date.now() * 1000, // microseconds
  };
}
