import { BALANCES } from "../store/exchange-store";

export function getUserBalance(userId: string) {
  return BALANCES.get(userId) ?? {};
}
