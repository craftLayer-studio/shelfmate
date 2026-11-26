import { isValidQty, lineAmount, type Unit } from "./quantity";

/** Drug schedule under the Drugs and Cosmetics Rules 1945. Scheduled items are not orderable by QR. */
export type DrugSchedule = "none" | "H" | "H1" | "X";

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  /** Selling price per unit in paise, GST inclusive. */
  price: number;
  mrp: number;
  hsn: string;
  /** GST rate in basis points (5% = 500). */
  gstRateBp: number;
  active: boolean;
  trackStock: boolean;
  stockMilli: number;
  schedule: DrugSchedule;
}

export interface CartLineInput {
  productId: string;
  qtyMilli: number;
}

export interface PricedLine {
  productId: string;
  name: string;
  unit: Unit;
  qtyMilli: number;
  unitPrice: number;
  amount: number;
  hsn: string;
  gstRateBp: number;
}

export class CartError extends Error {}

/** Can a customer order this from the QR catalog? */
export function isOrderable(p: CatalogProduct): boolean {
  return p.active && p.schedule === "none" && (!p.trackStock || p.stockMilli > 0);
}

/**
 * Price a cart from the catalog. Prices always come from the catalog, never the client.
 * Duplicate lines are merged. `forCounter` allows scheduled drugs (billed by the pharmacist).
 */
export function priceCart(
  catalog: readonly CatalogProduct[],
  lines: readonly CartLineInput[],
  opts: { forCounter?: boolean } = {},
): { lines: PricedLine[]; total: number } {
  if (lines.length === 0) throw new CartError("Cart is empty");
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.qtyMilli);
  const priced: PricedLine[] = [];
  for (const [productId, qtyMilli] of merged) {
    const p = byId.get(productId);
    if (!p || !p.active) throw new CartError("An item in your cart is no longer available");
    if (!opts.forCounter && p.schedule !== "none") throw new CartError(`${p.name} needs a prescription; buy it at the counter`);
    if (!isValidQty(p.unit, qtyMilli)) throw new CartError(`Invalid quantity for ${p.name}`);
    if (p.trackStock && p.stockMilli < qtyMilli) throw new CartError(`Only limited stock of ${p.name} is left`);
    priced.push({
      productId,
      name: p.name,
      unit: p.unit,
      qtyMilli,
      unitPrice: p.price,
      amount: lineAmount(p.price, qtyMilli),
      hsn: p.hsn,
      gstRateBp: p.gstRateBp,
    });
  }
  return { lines: priced, total: priced.reduce((s, l) => s + l.amount, 0) };
}
