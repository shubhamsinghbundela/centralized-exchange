import { beforeEach, describe, expect, test } from "bun:test";

import { BALANCES, ORDERBOOKS } from "../src/store/exchange-store";
import { getDepth } from "../src/depth/getDepth";
import { handleLimitOrder } from "../src/orders/handleLimitOrder";

describe("Order Book Depth", () => {
  beforeEach(() => {
    ORDERBOOKS.clear();
  });

  test("should return empty bids and asks when order book does not exist", () => {
    const depth = getDepth("BTC");

    expect(depth).toEqual({
      symbol: "BTC",
      bids: [],
      asks: [],
    });
  });

  test("should return bids sorted from highest price to lowest price", () => {
    BALANCES.set("buyer", {
      USD: {
        available: 10000,
        locked: 0,
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
      {
        price: 120,
        qty: 3,
      },
      {
        price: 100,
        qty: 5,
      },
      {
        price: 90,
        qty: 2,
      },
    ]);

    expect(depth.asks).toEqual([]);
  });

  test("should return asks sorted from lowest price to highest price", () => {
    BALANCES.set("seller", {
      BTC: {
        available: 20,
        locked: 0,
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
      {
        price: 90,
        qty: 2,
      },
      {
        price: 100,
        qty: 5,
      },
      {
        price: 120,
        qty: 3,
      },
    ]);

    expect(depth.bids).toEqual([]);
  });

  test("should aggregate orders at the same bid price level", () => {
    BALANCES.set("buyer", {
      USD: {
        available: 5000,
        locked: 0,
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

    expect(depth.bids).toEqual([
      {
        price: 100,
        qty: 8,
      },
    ]);

    expect(depth.asks).toEqual([]);
  });

  test("should not include fully filled orders in depth", () => {
    BALANCES.set("seller", {
      BTC: {
        available: 5,
        locked: 0,
      },
    });

    BALANCES.set("buyer", {
      USD: {
        available: 1000,
        locked: 0,
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
    });
  });
});
