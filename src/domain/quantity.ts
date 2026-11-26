/**
 * Quantities are integer thousandths of a unit ("milli units"), so loose items work without floats:
 * 1 pc = 1000, 0.25 kg = 250, 1.5 l = 1500.
 */
export type Unit = "pc" | "pack" | "kg" | "l";
export const UNITS: readonly Unit[] = ["pc", "pack", "kg", "l"];

export function isLoose(unit: Unit): boolean {
  return unit === "kg" || unit === "l";
}

/** Smallest orderable step in milli units: whole pieces, or 250 g / 250 ml for loose items. */
export function qtyStep(unit: Unit): number {
  return isLoose(unit) ? 250 : 1000;
}

export const MAX_QTY_MILLI = 50_000;

export function isValidQty(unit: Unit, qtyMilli: number): boolean {
  return Number.isInteger(qtyMilli) && qtyMilli > 0 && qtyMilli <= MAX_QTY_MILLI && qtyMilli % qtyStep(unit) === 0;
}

/** Price for a quantity, rounded to the paisa. `unitPrice` is per whole unit. */
export function lineAmount(unitPrice: number, qtyMilli: number): number {
  return Math.round((unitPrice * qtyMilli) / 1000);
}

/** 2000 pc -> "2 pc", 250 kg -> "250 g", 1500 kg -> "1.5 kg", 500 l -> "500 ml". */
export function formatQty(qtyMilli: number, unit: Unit): string {
  if (isLoose(unit) && qtyMilli < 1000) return `${qtyMilli} ${unit === "kg" ? "g" : "ml"}`;
  const n = qtyMilli / 1000;
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0+$/, "")} ${unit}`;
}
