import {
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
    };
  }

  const bids: DepthLevel[] = [...orderBook.bids.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 20)
    .map(([price, orders]) => ({
      price,
      qty: orders.reduce(
        (sum, order) => sum + (order.qty - order.filledQty),
        0,
      ),
    }));

  const asks: DepthLevel[] = [...orderBook.asks.entries()]
    .sort((a, b) => a[0] - b[0]) // lowest ask first
    .slice(0, 20)
    .map(([price, orders]) => ({
      price,
      qty: orders.reduce(
        (sum, order) => sum + (order.qty - order.filledQty),
        0,
      ),
    }));

  return {
    symbol,
    bids,
    asks,
  };
}
