import { beforeEach, describe, expect, test } from "bun:test";
import Decimal from "decimal.js";

import {
  BALANCES,
  ORDERBOOKS,
  ORDERS,
  ENGINE_STATE,
} from "../src/store/exchange-store";

import { handleLimitOrder } from "../src/orders/handleLimitOrder";

describe("Depth Delta Generation", () => {
  beforeEach(() => {
    BALANCES.clear();
    ORDERBOOKS.clear();
    ORDERS.clear();

    ENGINE_STATE.lastUpdateId = 500;
  });

  test("should generate correct depth updates for multiple resting limit orders", () => {
    // Initial balances

    BALANCES.set("seller", {
      USD: {
        available: new Decimal(100000),
        locked: new Decimal(0),
      },
      BTC: {
        available: new Decimal(10),
        locked: new Decimal(0),
      },
    });

    BALANCES.set("user1", {
      USD: {
        available: new Decimal(10000),
        locked: new Decimal(0),
      },
    });

    BALANCES.set("user2", {
      USD: {
        available: new Decimal(10000),
        locked: new Decimal(0),
      },
    });

    BALANCES.set("user3", {
      BTC: {
        available: new Decimal(10),
        locked: new Decimal(0),
      },
    });

    // Initial Order Book
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 99,
      qty: 3,
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 101,
      qty: 2,
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 102,
      qty: 1,
    });

    // Order 1 : BUY 2 @100
    const order1 = handleLimitOrder({
      userId: "user1",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 2,
    });

    expect(order1.depthUpdate).toEqual({
      s: "BTC",
      b: [["100", "7"]],
      a: [],
      U: 505,
      u: 505,
      T: expect.any(Number),
    });

    // Order 2 : BUY 1 @98
    const order2 = handleLimitOrder({
      userId: "user2",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 98,
      qty: 1,
    });

    expect(order2.depthUpdate).toEqual({
      s: "BTC",
      b: [["98", "1"]],
      a: [],
      U: 506,
      u: 506,
      T: expect.any(Number),
    });

    // Order 3 : SELL 1 @103
    const order3 = handleLimitOrder({
      userId: "user3",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 103,
      qty: 1,
    });

    expect(order3.depthUpdate).toEqual({
      s: "BTC",
      b: [],
      a: [["103", "1"]],
      U: 507,
      u: 507,
      T: expect.any(Number),
    });

    // // Verify final order book
    const book = ORDERBOOKS.get("BTC")!;

    expect(book.bids.get(100)![0]!.qty).toBe(5);
    expect(book.bids.get(100)![1]!.qty).toBe(2);

    expect(book.bids.get(99)![0]!.qty).toBe(3);

    expect(book.bids.get(98)![0]!.qty).toBe(1);

    expect(book.asks.get(101)![0]!.qty).toBe(2);
    expect(book.asks.get(102)![0]!.qty).toBe(1);
    expect(book.asks.get(103)![0]!.qty).toBe(1);
  });
});
