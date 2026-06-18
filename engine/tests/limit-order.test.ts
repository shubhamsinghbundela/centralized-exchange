import { beforeEach, describe, expect, test } from "bun:test";
import { BALANCES, ORDERBOOKS, ORDERS } from "../src/store/exchange-store";

import { handleLimitOrder } from "../src/orders/handleLimitOrder";

describe("Limit Order Matching", () => {
  beforeEach(() => {
    BALANCES.clear();
    ORDERBOOKS.clear();
    ORDERS.clear();
  });

  test("limit buy order should remain open when buy price is below best ask", () => {
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

    // Existing ask: 5 BTC @ 200
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 200,
      qty: 5,
    });

    // Buy 5 BTC @ 100
    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    expect(result.status).toBe("open");
    expect(result.filledQty).toBe(0);
    expect(result.averagePrice).toBeNull();
    expect(result.fills).toHaveLength(0);
  });

  test("limit buy order should fully match when buy price equals best ask", () => {
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

    // Buy 5 BTC @ 100
    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    expect(result.status).toBe("filled");
    expect(result.filledQty).toBe(5);
    expect(result.averagePrice).toBe(100);

    expect(result.fills).toHaveLength(1);

    expect(result.fills[0]).toMatchObject({
      qty: 5,
      price: 100,
    });
  });

  test("limit buy order with better price should execute at resting ask price", () => {
    // Seller owns 5 BTC
    BALANCES.set("seller", {
      BTC: {
        available: 5,
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

    // Existing ask: Sell 5 BTC @100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    // Incoming buy: Buy 5 BTC @200
    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 200,
      qty: 5,
    });

    expect(result.status).toBe("filled");
    expect(result.filledQty).toBe(5);

    // Trade should happen at resting order price
    expect(result.averagePrice).toBe(100);

    expect(result.fills).toHaveLength(1);

    expect(result.fills[0]).toMatchObject({
      price: 100,
      qty: 5,
    });

    // Seller receives USD
    expect(BALANCES.get("seller")?.USD?.available).toBe(500);

    // Buyer receives BTC
    expect(BALANCES.get("buyer")?.BTC?.available).toBe(5);
  });

  test("limit sell order should remain open when sell price is above best bid", () => {
    // Buyer owns USD
    BALANCES.set("buyer", {
      USD: {
        available: 1000,
        locked: 0,
      },
    });

    // Seller owns BTC
    BALANCES.set("seller", {
      BTC: {
        available: 5,
        locked: 0,
      },
    });

    // Existing bid: Buy 5 BTC @100
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    // Incoming sell: Sell 5 BTC @200
    const result = handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 200,
      qty: 5,
    });

    expect(result.status).toBe("open");
    expect(result.filledQty).toBe(0);
    expect(result.averagePrice).toBeNull();
    expect(result.fills).toHaveLength(0);
  });

  test("limit sell order with better price should execute at resting bid price", () => {
    // Buyer owns USD
    BALANCES.set("buyer", {
      USD: {
        available: 1000,
        locked: 0,
      },
    });

    // Seller owns BTC
    BALANCES.set("seller", {
      BTC: {
        available: 5,
        locked: 0,
      },
    });

    // Existing bid: Buy 5 BTC @200
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 200,
      qty: 5,
    });

    // Incoming sell: Sell 5 BTC @100
    const result = handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    expect(result.status).toBe("filled");
    expect(result.filledQty).toBe(5);

    // Trade should happen at the resting bid price, NOT 100
    expect(result.averagePrice).toBe(200);

    expect(result.fills).toHaveLength(1);

    expect(result.fills[0]).toMatchObject({
      price: 200,
      qty: 5,
    });
  });

  test("limit buy order should partially fill and rest remaining quantity on bids", () => {
    // Seller owns 3 BTC
    BALANCES.set("seller", {
      BTC: {
        available: 3,
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

    // Existing ask: Sell 3 BTC @100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 3,
    });

    // Incoming buy: Buy 10 BTC @100
    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    expect(result.status).toBe("partially_filled");
    expect(result.filledQty).toBe(3);
    expect(result.averagePrice).toBe(100);

    expect(result.fills).toHaveLength(1);

    expect(result.fills[0]).toMatchObject({
      price: 100,
      qty: 3,
    });

    // Verify depth
    const book = ORDERBOOKS.get("BTC");

    expect(book?.asks).toHaveLength(0);

    expect(book?.bids).toHaveLength(1);
  });

  test("limit buy order should match multiple price levels from cheapest ask first", () => {
    // Setup sellers
    BALANCES.set("seller1", {
      BTC: {
        available: 2,
        locked: 0,
      },
    });

    BALANCES.set("seller2", {
      BTC: {
        available: 3,
        locked: 0,
      },
    });

    BALANCES.set("seller3", {
      BTC: {
        available: 5,
        locked: 0,
      },
    });

    // Buyer has enough USD
    BALANCES.set("buyer", {
      USD: {
        available: 1200,
        locked: 0,
      },
    });

    // Create asks
    handleLimitOrder({
      userId: "seller1",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 2,
    });

    handleLimitOrder({
      userId: "seller2",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 110,
      qty: 3,
    });

    handleLimitOrder({
      userId: "seller3",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 120,
      qty: 5,
    });

    // Buy 10 BTC @120
    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 120,
      qty: 10,
    });

    expect(result.status).toBe("filled");
    expect(result.filledQty).toBe(10);

    // Weighted average price
    expect(result.averagePrice).toBe(113);

    expect(result.fills).toHaveLength(3);

    expect(result.fills[0]).toMatchObject({
      price: 100,
      qty: 2,
    });

    expect(result.fills[1]).toMatchObject({
      price: 110,
      qty: 3,
    });

    expect(result.fills[2]).toMatchObject({
      price: 120,
      qty: 5,
    });

    // Order book should now be empty
    const book = ORDERBOOKS.get("BTC");

    expect(book?.asks).toHaveLength(0);
    expect(book?.bids).toHaveLength(0);

    // Buyer received 10 BTC
    expect(BALANCES.get("buyer")?.BTC?.available).toBe(10);

    // Sellers received USD
    expect(BALANCES.get("seller1")?.USD?.available).toBe(200);
    expect(BALANCES.get("seller2")?.USD?.available).toBe(330);
    expect(BALANCES.get("seller3")?.USD?.available).toBe(600);
  });

  test("limit buy order should not cross above allowed price", () => {
    // Setup sellers
    BALANCES.set("seller1", {
      BTC: {
        available: 2,
        locked: 0,
      },
    });

    BALANCES.set("seller2", {
      BTC: {
        available: 3,
        locked: 0,
      },
    });

    BALANCES.set("seller3", {
      BTC: {
        available: 5,
        locked: 0,
      },
    });

    // Buyer has enough USD
    BALANCES.set("buyer", {
      USD: {
        available: 2000,
        locked: 0,
      },
    });

    // Existing asks
    handleLimitOrder({
      userId: "seller1",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 2,
    });

    handleLimitOrder({
      userId: "seller2",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 110,
      qty: 3,
    });

    handleLimitOrder({
      userId: "seller3",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 130,
      qty: 5,
    });

    // Incoming buy: Buy 10 BTC @110
    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 110,
      qty: 10,
    });

    expect(result.status).toBe("partially_filled");
    expect(result.filledQty).toBe(5);

    // (2×100 + 3×110) / 5 = 106
    expect(result.averagePrice).toBe(106);

    expect(result.fills).toHaveLength(2);

    expect(result.fills[0]).toMatchObject({
      price: 100,
      qty: 2,
    });

    expect(result.fills[1]).toMatchObject({
      price: 110,
      qty: 3,
    });

    const book = ORDERBOOKS.get("BTC");

    // Remaining ask should stay
    expect(book?.asks).toHaveLength(1);

    // Remaining quantity (10 - 5 = 5) should rest on bids
    expect(book?.bids).toHaveLength(1);

    // Buyer receives 5 BTC
    expect(BALANCES.get("buyer")?.BTC?.available).toBe(5);

    // Sellers receive USD
    expect(BALANCES.get("seller1")?.USD?.available).toBe(200);
    expect(BALANCES.get("seller2")?.USD?.available).toBe(330);

    // Seller3 should still have 5 BTC locked in the resting ask
    expect(BALANCES.get("seller3")?.BTC).toEqual({
      available: 0,
      locked: 5,
    });
  });
});
