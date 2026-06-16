// import { handleMarketOrder } from "./handleMarketOrder";
import type { CreateOrderInput } from "../store/exchange-store";
import { handleLimitOrder } from "./handleLimitOrder";
import { handleMarketOrder } from "./handleMarketOrder";

export function handleCreateOrder(payload: Record<string, unknown>) {
  const input = payload as unknown as CreateOrderInput;

  if (input.type === "limit") {
    return handleLimitOrder(input);
  }

  return handleMarketOrder(input);
}
