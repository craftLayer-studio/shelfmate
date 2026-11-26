export type KhataKind = "credit" | "payment";

export interface KhataEntryLike {
  kind: KhataKind;
  amount: number;
  createdAt: number;
}

/** Outstanding balance in paise: credit given minus payments received. Negative means advance. */
export function khataBalance(entries: readonly KhataEntryLike[]): number {
  return entries.reduce((s, e) => s + (e.kind === "credit" ? e.amount : -e.amount), 0);
}

/** Running balance after each entry, oldest first. */
export function withRunningBalance<T extends KhataEntryLike>(entries: readonly T[]): (T & { balance: number })[] {
  let bal = 0;
  return [...entries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((e) => {
      bal += e.kind === "credit" ? e.amount : -e.amount;
      return { ...e, balance: bal };
    });
}

/**
 * Whether a new credit of `amount` is allowed. A credit limit of 0 means no limit.
 * Khata must be switched on for the customer by the owner first.
 */
export function canGiveCredit(params: { khataEnabled: boolean; balance: number; creditLimit: number; amount: number }): {
  ok: boolean;
  reason?: string;
} {
  if (!params.khataEnabled) return { ok: false, reason: "Khata is not enabled for this customer" };
  if (params.creditLimit > 0 && params.balance + params.amount > params.creditLimit) {
    return { ok: false, reason: "This would cross the customer's credit limit" };
  }
  return { ok: true };
}

/** Days since the last payment (or the first credit if never paid). Null when nothing is owed. */
export function daysOverdue(entries: readonly KhataEntryLike[], now: number): number | null {
  if (khataBalance(entries) <= 0) return null;
  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  const lastPayment = [...sorted].reverse().find((e) => e.kind === "payment");
  const firstCredit = sorted.find((e) => e.kind === "credit");
  const since = lastPayment?.createdAt ?? firstCredit?.createdAt ?? now;
  return Math.max(0, Math.floor((now - since) / 86_400_000));
}
