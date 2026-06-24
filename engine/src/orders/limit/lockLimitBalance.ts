import Decimal from "decimal.js";
import type { CreateOrderInput } from "../../store/exchange-store";
import { getBalance } from "../../utils/getBalance";

/**
 * Validates user balances and locks the required balance/assets
 * so they cannot be used by another order while this order
 * is waiting in the order book or being matched.
 */

export function lockLimitBalance(input: CreateOrderInput) {
  if (input.side === "buy") {
    //Buyer pays using USD.
    //Example:
    // Cost of 1 SOL = $80, Quantity = 2
    // Total required = 80 * 2 = $160
    const usdBalance = getBalance(input.userId, "USD");

    const requiredAmount = new Decimal(input.price!).mul(input.qty);

    if (usdBalance.available.lt(requiredAmount)) {
      throw new Error("Insufficient USD balance");
    }

    usdBalance.available = usdBalance.available.minus(requiredAmount);
    usdBalance.locked = usdBalance.locked.plus(requiredAmount);
  } else {
    // Seller must own enough of the asset being sold.
    const assetBalance = getBalance(input.userId, input.symbol);

    const qty = new Decimal(input.qty);

    if (assetBalance.available.lt(qty)) {
      throw new Error(`Insufficient ${input.symbol} balance`);
    }

    assetBalance.available = assetBalance.available.minus(qty);
    assetBalance.locked = assetBalance.locked.plus(qty);
  }
}
