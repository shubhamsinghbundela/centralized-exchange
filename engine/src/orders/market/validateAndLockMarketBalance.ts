import type { CreateOrderInput } from "../../store/exchange-store";
import { getBalance } from "../../utils/getBalance";
import { validateMarketBuyBalance } from "./validateMarketBuyBalance";

export function validateAndLockMarketBalance(input: CreateOrderInput) {
  if (input.side === "sell") {
    const assetBalance = getBalance(input.userId, input.symbol);

    if (assetBalance.available < input.qty) {
      throw new Error(`Insufficient ${input.symbol} balance`);
    }

    assetBalance.available -= input.qty;
    assetBalance.locked += input.qty;
  }

  if (input.side === "buy") {
    validateMarketBuyBalance(input);
  }
}
