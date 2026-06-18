import { BALANCES, type Balance } from "../store/exchange-store";

export function getBalance(userId: string, asset: string) {
  let balances = BALANCES.get(userId);

  if (!balances) {
    balances = {};
    BALANCES.set(userId, balances);
  }

  if (!balances[asset]) {
    balances[asset] = {
      available: 0,
      locked: 0,
    };
  }

  return balances[asset];
}
