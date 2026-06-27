import { beforeEach, describe, expect, test } from "bun:test";

import {
  BALANCES,
  ENGINE_STATE,
  ORDERBOOKS,
  ORDERS,
} from "../src/store/exchange-store";
import { getDepth } from "../src/depth/getDepth";
import { handleLimitOrder } from "../src/orders/handleLimitOrder";
import Decimal from "decimal.js";

describe("Order Book Depth", () => {
  beforeEach(() => {
    BALANCES.clear();
    ORDERBOOKS.clear();
    ORDERS.clear();
    ENGINE_STATE.lastUpdateId = 0;
  });

  test("should return empty bids and asks when order book does not exist", () => {
    const depth = getDepth("BTC");

    expect(depth).toEqual({
      symbol: "BTC",
      bids: [],
      asks: [],
      lastUpdateId: ENGINE_STATE.lastUpdateId,
    });
  });

  test("should return bids sorted from highest price to lowest price", () => {
    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(10000),
        locked: new Decimal(0),
      },
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 120,
      qty: 3,
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 90,
      qty: 2,
    });

    const depth = getDepth("BTC");

    expect(depth.bids).toEqual([
      ["120", "3"],
      ["100", "5"],
      ["90", "2"],
    ]);

    expect(depth.asks).toEqual([]);
  });

  test("should return asks sorted from lowest price to highest price", () => {
    BALANCES.set("seller", {
      BTC: {
        available: new Decimal(20),
        locked: new Decimal(0),
      },
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 120,
      qty: 3,
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 90,
      qty: 2,
    });

    const depth = getDepth("BTC");

    expect(depth.asks).toEqual([
      ["90", "2"],
      ["100", "5"],
      ["120", "3"],
    ]);

    expect(depth.bids).toEqual([]);
  });

  test("should aggregate orders at the same bid price level", () => {
    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(5000),
        locked: new Decimal(0),
      },
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 3,
    });

    const depth = getDepth("BTC");

    expect(depth.bids).toEqual([["100", "8"]]);

    expect(depth.asks).toEqual([]);
  });

  test("should not include fully filled orders in depth", () => {
    BALANCES.set("seller", {
      BTC: {
        available: new Decimal(5),
        locked: new Decimal(0),
      },
    });

    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(1000),
        locked: new Decimal(0),
      },
    });

    // Resting ask: 5 BTC @ 100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    // Fully match the ask
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    const depth = getDepth("BTC");

    expect(depth).toEqual({
      symbol: "BTC",
      bids: [],
      asks: [],
      lastUpdateId: ENGINE_STATE.lastUpdateId,
    });
  });
});
