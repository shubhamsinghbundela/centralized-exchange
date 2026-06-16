import { ORDERBOOKS, type OrderBook } from "../store/exchange-store";

export function getOrderBook(symbol: string): OrderBook {
  let book = ORDERBOOKS.get(symbol);

  if (!book) {
    book = {
      bids: new Map(),
      asks: new Map(),
    };

    ORDERBOOKS.set(symbol, book);
  }

  return book;
}
