import Decimal from "decimal.js";
import { BALANCES } from "../store/exchange-store.js";

export function handleDeposit(payload: Record<string, unknown>) {
  const userId = payload.userId as string;
  const asset = payload.asset as string;
  const amount = new Decimal(payload.amount as string);

  let balances = BALANCES.get(userId);

  if (!balances) {
    balances = {};
    BALANCES.set(userId, balances);
  }

  const balance = balances[asset] ?? {
    available: new Decimal(0),
    locked: new Decimal(0),
  };

  balance.available = balance.available.plus(amount);

  balances[asset] = balance;

  return {
    userId,
    asset,
    balance,
  };
}
