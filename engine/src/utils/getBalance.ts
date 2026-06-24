import Decimal from "decimal.js";
import { BALANCES, type Balance } from "../store/exchange-store";

export function getBalance(userId: string, asset: string) {
  let balances = BALANCES.get(userId);

  if (!balances) {
    balances = {};
    BALANCES.set(userId, balances);
  }

  if (!balances[asset]) {
    balances[asset] = {
      available: new Decimal(0),
      locked: new Decimal(0),
    };
  }

  return balances[asset];
}
