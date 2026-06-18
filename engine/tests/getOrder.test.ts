import { beforeEach, describe, expect, test } from "bun:test";

import { BALANCES, ORDERBOOKS, ORDERS } from "../src/store/exchange-store";

import { handleLimitOrder } from "../src/orders/handleLimitOrder";
import { getOrder } from "../src/orders/getOrder";

describe("Get Order", () => {
  beforeEach(() => {
    BALANCES.clear();
    ORDERBOOKS.clear();
    ORDERS.clear();
  });

  test("should return an open order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: 1_000_000,
        locked: 0,
      },
    });

    const result = handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    const order = getOrder("buyer", result?.orderId);

    expect(order.orderId).toBe(result?.orderId);
    expect(order.userId).toBe("buyer");
    expect(order.side).toBe("buy");
    expect(order.type).toBe("limit");
    expect(order.symbol).toBe("BTC");
    expect(order.price).toBe(100);
    expect(order.qty).toBe(5);
    expect(order.filledQty).toBe(0);
    expect(order.status).toBe("open");
    expect(order.fills).toEqual([]);
  });

  test("should return a partially filled order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: 1000000,
        locked: 0,
      },
    });

    BALANCES.set("seller", {
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    // Buy 10 BTC @ 100
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const buyOrderId = [...ORDERS.values()].find(
      (order) => order.userId === "buyer",
    )?.orderId;

    // Sell only 4 BTC @ 100
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 4,
    });

    const order = getOrder("buyer", buyOrderId!);
    expect(order.orderId).toBe(buyOrderId!);
    expect(order.side).toBe("buy");
    expect(order.type).toBe("limit");
    expect(order.symbol).toBe("BTC");
    expect(order.price).toBe(100);

    expect(order.qty).toBe(10);
    expect(order.filledQty).toBe(4);

    expect(order.status).toBe("partially_filled");

    expect(order.fills).toHaveLength(1);
  });

  test("should return a filled order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: 1000000,
        locked: 0,
      },
    });

    BALANCES.set("seller", {
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    // Buy 10 BTC @ 100
    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const buyOrderId = [...ORDERS.values()].find(
      (order) => order.userId === "buyer",
    )!.orderId;

    // Fully match the order
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const order = getOrder("buyer", buyOrderId);

    expect(order.orderId).toBe(buyOrderId);

    expect(order.status).toBe("filled");
    expect(order.filledQty).toBe(10);

    expect(order.side).toBe("buy");
    expect(order.type).toBe("limit");
    expect(order.symbol).toBe("BTC");
    expect(order.price).toBe(100);
    expect(order.qty).toBe(10);

    expect(order.fills.length).toBeGreaterThan(0);
  });

  test("should throw an error for an unknown order", () => {
    expect(() => {
      getOrder("buyer", "unknown-order-id");
    }).toThrow("Order not found");
  });

  test("should not allow a user to read another user's order", () => {
    BALANCES.set("seller", {
      BTC: {
        available: 1000,
        locked: 0,
      },
    });

    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 5,
    });

    const sellerOrderId = [...ORDERS.values()].find(
      (order) => order.userId === "seller",
    )!.orderId;

    expect(() => {
      getOrder("buyer", sellerOrderId);
    }).toThrow("Order not found");
  });
});
