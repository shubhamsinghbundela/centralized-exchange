import { BALANCES, type Balance } from "../store/exchange-store";

export function getBalance(userId: string, asset: string): Balance {
  const balances = BALANCES.get(userId);

  if (!balances) {
    throw new Error("User balance not found");
  }

  const balance = balances[asset];

  if (!balance) {
    throw new Error(`No ${asset} balance found`);
  }

  return balance;
}
