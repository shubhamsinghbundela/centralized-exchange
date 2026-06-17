import type { CreateOrderInput } from "../../store/exchange-store";
import { getBalance } from "../../utils/getBalance";
import { validateMarketBuyBalance } from "./validateMarketBuyBalance";

/**
 * Validates that the user has sufficient balance for a market order
 * and locks the required funds/assets before matching begins.
 *
 * Sell orders lock the asset quantity being sold.
 * Buy orders validate and lock the maximum quote balance required
 * to execute against the current order book.
 */
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
