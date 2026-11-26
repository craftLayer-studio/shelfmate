import { lineAmount } from "./quantity";
import { financialYear } from "./time";

/** Slabs after the September 2025 GST rationalisation (0, 5, 18, 40%). Rates are set per product by the owner. */
export const GST_RATES_BP = [0, 500, 1800, 4000] as const;

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_RE.test(gstin);
}

export function isValidHsn(hsn: string): boolean {
  return /^\d{4}(\d{2}(\d{2})?)?$/.test(hsn);
}

export interface InvoiceLineInput {
  name: string;
  hsn: string;
  qtyMilli: number;
  /** GST-inclusive price per unit, paise. */
  unitPrice: number;
  gstRateBp: number;
}

export interface InvoiceLine extends InvoiceLineInput {
  total: number;
  taxable: number;
  cgst: number;
  sgst: number;
}

export interface TaxSummaryRow {
  hsn: string;
  gstRateBp: number;
  taxable: number;
  cgst: number;
  sgst: number;
}

export interface InvoiceTotals {
  kind: "tax_invoice" | "bill_of_supply";
  lines: InvoiceLine[];
  taxable: number;
  cgst: number;
  sgst: number;
  total: number;
  summary: TaxSummaryRow[];
}

/**
 * Split GST-inclusive retail prices into taxable value and CGST + SGST (intra-state sale).
 * A composition dealer issues a bill of supply and cannot collect tax, so no split is shown.
 * Totals are the sum of the line amounts, so the customer pays exactly the shelf price.
 */
export function computeInvoice(inputs: readonly InvoiceLineInput[], opts: { composition: boolean }): InvoiceTotals {
  const lines: InvoiceLine[] = inputs.map((l) => {
    const total = lineAmount(l.unitPrice, l.qtyMilli);
    if (opts.composition) return { ...l, total, taxable: total, cgst: 0, sgst: 0 };
    const taxable = Math.round((total * 10_000) / (10_000 + l.gstRateBp));
    const tax = total - taxable;
    const cgst = Math.round(tax / 2);
    return { ...l, total, taxable, cgst, sgst: tax - cgst };
  });
  const summaryMap = new Map<string, TaxSummaryRow>();
  for (const l of lines) {
    const key = `${l.hsn}|${l.gstRateBp}`;
    const row = summaryMap.get(key) ?? { hsn: l.hsn, gstRateBp: l.gstRateBp, taxable: 0, cgst: 0, sgst: 0 };
    row.taxable += l.taxable;
    row.cgst += l.cgst;
    row.sgst += l.sgst;
    summaryMap.set(key, row);
  }
  const sum = (k: "taxable" | "cgst" | "sgst" | "total") => lines.reduce((s, l) => s + l[k], 0);
  return {
    kind: opts.composition ? "bill_of_supply" : "tax_invoice",
    lines,
    taxable: sum("taxable"),
    cgst: sum("cgst"),
    sgst: sum("sgst"),
    total: sum("total"),
    summary: opts.composition ? [] : [...summaryMap.values()].sort((a, b) => a.hsn.localeCompare(b.hsn)),
  };
}

/** GST invoice numbers must be unique per financial year and at most 16 characters: "SM/26-27/0042". */
export function invoiceNumber(seq: number, at: number, prefix = "SM"): string {
  const fy = financialYear(at).slice(2);
  return `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;
}

/** "5%" from basis points. */
export function formatRate(bp: number): string {
  return `${bp / 100}%`;
}
