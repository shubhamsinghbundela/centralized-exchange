import { beforeEach, describe, expect, test } from "bun:test";

import { BALANCES } from "../src/store/exchange-store";
import { getUserBalance } from "../src/balance/getUserBalance";
import { handleLimitOrder } from "../src/orders/handleLimitOrder";

describe("Get User Balance", () => {
  beforeEach(() => {
    BALANCES.clear();
  });

  test("should return default balances for a new user", () => {
    BALANCES.set("user1", {
      USD: {
        available: 1000000,
        locked: 0,
      },
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    const balances = getUserBalance("user1");

    expect(balances).toEqual({
      USD: {
        available: 1000000,
        locked: 0,
      },
      BTC: {
        available: 1000,
        locked: 0,
      },
    });
  });

  test("should update buyer balance after a filled trade", () => {
    BALANCES.set("buyer", {
      USD: {
        available: 1000000,
        locked: 0,
      },
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    BALANCES.set("seller", {
      BTC: {
        available: 1005,
        locked: 0,
      },
      USD: {
        available: 1000000,
        locked: 0,
      },
    });

    // Seller places ask: 5 BTC @ 100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    // Buyer fills it
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    const balance = getUserBalance("buyer");

    expect(balance?.USD?.available).toBe(999500);
    expect(balance?.BTC?.available).toBe(1005);
  });

  test("should update seller balance after a filled trade", () => {
    BALANCES.set("seller", {
      USD: {
        available: 1000000,
        locked: 0,
      },
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    BALANCES.set("buyer", {
      USD: {
        available: 1000000,
        locked: 0,
      },
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    // Seller places ask: 5 BTC @ 100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    // Buyer fills it
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    const balance = getUserBalance("seller");

    expect(balance).toBeDefined();

    expect(balance?.USD?.available).toBe(1000500);
    expect(balance?.BTC?.available).toBe(995);

    expect(balance?.USD?.locked).toBe(0);
    expect(balance?.BTC?.locked).toBe(0);
  });
});
