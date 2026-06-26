// import { handleMarketOrder } from "./handleMarketOrder";
import { isMarketOpen } from "../market/marketState";
import type { CreateOrderInput } from "../store/exchange-store";
import { handleLimitOrder } from "./handleLimitOrder";
import { handleMarketOrder } from "./handleMarketOrder";

export function handleCreateOrder(payload: Record<string, unknown>) {
  const input = payload as unknown as CreateOrderInput;

  if (!isMarketOpen()) {
    throw new Error("Market is closed");
  }

  if (input.type === "limit") {
    return handleLimitOrder(input);
  }

  return handleMarketOrder(input);
}
