import { GST_RATES_BP, UNITS } from "@/domain";
import { BadRequest, bool, int, oneOf, optStr, str } from "./http";
import type { ProductInput } from "./store";

export function parseProduct(b: Record<string, unknown>): ProductInput {
  const rate = int(b, "gstRateBp", 0, 4000);
  if (!(GST_RATES_BP as readonly number[]).includes(rate)) throw new BadRequest("GST rate must be 0, 5, 18 or 40%");
  return {
    name: str(b, "name", 120),
    brand: optStr(b, "brand", 60),
    category: str(b, "category", 60),
    unit: oneOf(b, "unit", UNITS),
    price: int(b, "price", 1, 10_000_000),
    mrp: int(b, "mrp", 1, 10_000_000),
    hsn: str(b, "hsn", 8),
    gstRateBp: rate,
    schedule: oneOf(b, "schedule", ["none", "H", "H1", "X"] as const),
    trackStock: bool(b, "trackStock"),
    stockMilli: int(b, "stockMilli", 0, 10_000_000),
    minStockMilli: int(b, "minStockMilli", 0, 10_000_000),
    active: bool(b, "active"),
  };
}
