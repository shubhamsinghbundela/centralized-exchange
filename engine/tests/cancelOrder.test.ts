import { beforeEach, describe, expect, test } from "bun:test";

import { BALANCES, ORDERBOOKS, ORDERS } from "../src/store/exchange-store";

import { handleLimitOrder } from "../src/orders/handleLimitOrder";
import { cancelOrder } from "../src/orders/cancelOrder";
import Decimal from "decimal.js";

describe("Cancel Order", () => {
  beforeEach(() => {
    BALANCES.clear();
    ORDERBOOKS.clear();
    ORDERS.clear();
  });

  test("should cancel an open limit order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(1000000),
        locked: new Decimal(0),
      },
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const orderId = [...ORDERS.keys()][0];

    const result = cancelOrder("buyer", orderId!);

    expect(result).toEqual({
      orderId: result.orderId,
      status: "cancelled",
      qty: result.qty,
      filledQty: result.filledQty,
    });

    const order = ORDERS.get(orderId!);

    expect(order?.status).toBe("cancelled");
    expect(order?.qty).toBe(10);
    expect(order?.filledQty).toBe(0);

    const orderBook = ORDERBOOKS.get("BTC");

    expect(orderBook?.bids.get(100)).toBeUndefined();
  });

  test("should cancel a partially filled order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(1_000_000),
        locked: new Decimal(0),
      },
    });

    BALANCES.set("seller", {
      BTC: {
        available: new Decimal(1000),
        locked: new Decimal(0),
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

    const orderId = [...ORDERS.values()].find(
      (o) => o.userId === "buyer",
    )!.orderId;

    // Fill only 4 BTC
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 4,
    });

    let order = ORDERS.get(orderId);

    expect(order?.status).toBe("partially_filled");
    expect(order?.filledQty).toBe(4);

    const result = cancelOrder("buyer", orderId);

    expect(result).toEqual({
      orderId: result.orderId,
      status: "cancelled",
      qty: result.qty,
      filledQty: result.filledQty,
    });

    order = ORDERS.get(orderId);

    expect(order?.status).toBe("cancelled");
    expect(order?.qty).toBe(10);
    expect(order?.filledQty).toBe(4);

    // Remaining 6 BTC removed from depth
    const orderBook = ORDERBOOKS.get("BTC");

    expect(orderBook?.bids.get(100)).toBeUndefined();
  });

  test("should not allow cancelling a filled order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(1000000),
        locked: new Decimal(0),
      },
    });

    BALANCES.set("seller", {
      BTC: {
        available: new Decimal(1000),
        locked: new Decimal(0),
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

    const orderId = [...ORDERS.values()].find(
      (o) => o.userId === "buyer",
    )!.orderId;

    // Fully fill the order
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const order = ORDERS.get(orderId);

    expect(order?.status).toBe("filled");
    expect(order?.filledQty).toBe(10);

    expect(() => cancelOrder("buyer", orderId)).toThrow(
      "filled orders cannot be cancelled",
    );
  });

  test("should not allow cancelling an already cancelled order", () => {
    BALANCES.set("buyer", {
      USD: {
        available: new Decimal(1_000_000),
        locked: new Decimal(0),
      },
    });

    handleLimitOrder({
      userId: "buyer",
      type: "limit",
      side: "buy",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const orderId = [...ORDERS.values()].find(
      (o) => o.userId === "buyer",
    )!.orderId;

    // First cancellation succeeds
    const result = cancelOrder("buyer", orderId);

    expect(result).toEqual({
      orderId,
      status: "cancelled",
      qty: result.qty,
      filledQty: result.filledQty,
    });

    expect(ORDERS.get(orderId)?.status).toBe("cancelled");

    // Second cancellation should fail
    expect(() => cancelOrder("buyer", orderId)).toThrow(
      "order already cancelled",
    );
  });

  test("should return an error for an unknown order", () => {
    expect(() => cancelOrder("buyer", "unknown-order-id")).toThrow(
      "order not found",
    );
  });

  test("should not allow a user to cancel another user's order", () => {
    BALANCES.set("seller", {
      BTC: {
        available: new Decimal(1000),
        locked: new Decimal(0),
      },
    });

    // Seller creates an order
    handleLimitOrder({
      userId: "seller",
      type: "limit",
      side: "sell",
      symbol: "BTC",
      price: 100,
      qty: 10,
    });

    const orderId = [...ORDERS.values()].find(
      (o) => o.userId === "seller",
    )!.orderId;

    // Buyer tries to cancel seller's order
    expect(() => cancelOrder("buyer", orderId)).toThrow("order not found");

    // Order should still exist and remain open
    expect(ORDERS.get(orderId)?.status).toBe("open");
  });
});
