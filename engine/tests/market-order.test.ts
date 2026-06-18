import { beforeEach, describe, expect, test } from "bun:test";
import { BALANCES, ORDERBOOKS, ORDERS } from "../src/store/exchange-store";

import { handleLimitOrder } from "../src/orders/handleLimitOrder";
import { handleMarketOrder } from "../src/orders/handleMarketOrder";

describe("Market Order Matching", () => {
  beforeEach(() => {
    BALANCES.clear();
    ORDERBOOKS.clear();
    ORDERS.clear();
  });

  test("market buy order should be fully filled using best ask", () => {
    // Seller has BTC
    BALANCES.set("seller", {
      BTC: {
        available: 5,
        locked: 0,
      },
    });

    // Buyer has USD
    BALANCES.set("buyer", {
      USD: {
        available: 1000,
        locked: 0,
      },
    });

    // Existing ask: 5 BTC @ 100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    // Market buy 5 BTC
    const result = handleMarketOrder({
      userId: "buyer",
      type: "market",
      side: "buy",
      symbol: "BTC",
      price: null,
      qty: 5,
    });

    expect(result).toMatchObject({
      status: "filled",
      filledQty: 5,
      averagePrice: 100,
    });

    expect(result.fills).toHaveLength(1);

    expect(result.fills[0]).toMatchObject({
      price: 100,
      qty: 5,
    });
  });

  test("market buy order should be partially filled when liquidity is insufficient", () => {
    // Seller has only 2 BTC
    BALANCES.set("seller", {
      BTC: {
        available: 2,
        locked: 0,
      },
    });

    // Buyer has enough USD
    BALANCES.set("buyer", {
      USD: {
        available: 1000,
        locked: 0,
      },
    });

    // Existing ask: 2 BTC @ 100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 2,
    });

    // Market buy 5 BTC
    const result = handleMarketOrder({
      userId: "buyer",
      type: "market",
      side: "buy",
      symbol: "BTC",
      price: null,
      qty: 5,
    });

    expect(result).toMatchObject({
      status: "partially_filled",
      filledQty: 2,
      averagePrice: 100,
    });

    expect(result.fills).toHaveLength(1);

    expect(result.fills[0]).toMatchObject({
      price: 100,
      qty: 2,
    });
  });

  test("market buy order should be cancelled when order book is empty", () => {
    // Buyer has enough USD
    BALANCES.set("buyer", {
      USD: {
        available: 1000,
        locked: 0,
      },
    });

    const result = handleMarketOrder({
      userId: "buyer",
      type: "market",
      side: "buy",
      symbol: "BTC",
      price: null,
      qty: 5,
    });

    expect(result).toMatchObject({
      status: "cancelled",
      filledQty: 0,
      averagePrice: null,
    });

    expect(result.fills).toEqual([]);
  });
});
