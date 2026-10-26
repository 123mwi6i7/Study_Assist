import { formatBudget } from "@/lib/assignments/presentation";
export { parseCurrencyAmount } from "@/lib/marketplace/amount";

export function formatCurrencyAmount(amountMinor: number | string, currency: string) {
  return formatBudget(amountMinor, currency);
}
