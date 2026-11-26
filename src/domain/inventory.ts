import { daysBetween } from "./time";

export interface StockItem {
  id: string;
  name: string;
  trackStock: boolean;
  stockMilli: number;
  minStockMilli: number;
}

export interface BatchLike {
  id: string;
  productId: string;
  productName: string;
  batchNo: string;
  /** "YYYY-MM-DD" */
  expiry: string;
  qtyMilli: number;
}

export type ExpiryState = "expired" | "expiring" | "ok";

/** Tracked items at or below their minimum stock, emptiest first. */
export function lowStock<T extends StockItem>(items: readonly T[]): T[] {
  return items
    .filter((p) => p.trackStock && p.stockMilli <= p.minStockMilli)
    .sort((a, b) => a.stockMilli / Math.max(1, a.minStockMilli) - b.stockMilli / Math.max(1, b.minStockMilli));
}

export function expiryState(expiry: string, today: string, windowDays: number): ExpiryState {
  const left = daysBetween(today, expiry);
  if (left < 0) return "expired";
  return left <= windowDays ? "expiring" : "ok";
}

/** Batches with stock that have expired or expire within `windowDays`, soonest first. */
export function expiryAlerts(batches: readonly BatchLike[], today: string, windowDays = 30): (BatchLike & { daysLeft: number; state: ExpiryState })[] {
  return batches
    .filter((b) => b.qtyMilli > 0)
    .map((b) => ({ ...b, daysLeft: daysBetween(today, b.expiry), state: expiryState(b.expiry, today, windowDays) }))
    .filter((b) => b.state !== "ok")
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** WhatsApp purchase-order text for the distributor. */
export function reorderText(store: string, items: readonly { name: string; qty: string }[]): string {
  return `Order from ${store}:\n${items.map((i) => `- ${i.name}: ${i.qty}`).join("\n")}\nPlease confirm. Thank you.`;
}
