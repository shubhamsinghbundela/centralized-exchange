// handlers/deposit.ts

import { BALANCES } from "../store/exchange-store.js";

export function handleDeposit(payload: Record<string, unknown>) {
  const userId = payload.userId as string;
  const asset = payload.asset as string;
  const amount = Number(payload.amount);

  let balances = BALANCES.get(userId);

  if (!balances) {
    balances = {};
    BALANCES.set(userId, balances);
  }

  const balance = balances[asset] ?? {
    available: 0,
    locked: 0,
  };

  balance.available += amount;

  balances[asset] = balance;

  return {
    userId,
    asset,
    balance,
  };
}
