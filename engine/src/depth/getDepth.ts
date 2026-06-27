import {
  ENGINE_STATE,
  ORDERBOOKS,
  type DepthLevel,
  type DepthResponse,
} from "../store/exchange-store.js";

export function getDepth(symbol: string): DepthResponse {
  const orderBook = ORDERBOOKS.get(symbol);

  if (!orderBook) {
    return {
      symbol,
      bids: [],
      asks: [],
      lastUpdateId: ENGINE_STATE.lastUpdateId,
    };
  }

  const bids: DepthLevel[] = [...orderBook.bids.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([price, orders]) => [
      price.toString(),
      orders
        .reduce((sum, order) => sum + (order.qty - order.filledQty), 0)
        .toString(),
    ]);

  const asks: DepthLevel[] = [...orderBook.asks.entries()]
    .sort((a, b) => a[0] - b[0]) // lowest ask first
    .map(([price, orders]) => [
      price.toString(),
      orders
        .reduce((sum, order) => sum + (order.qty - order.filledQty), 0)
        .toString(),
    ]);

  return {
    symbol,
    bids,
    asks,
    lastUpdateId: ENGINE_STATE.lastUpdateId,
  };
}
