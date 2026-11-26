import { describe, expect, it } from "vitest";
import {
  buildDashboard,
  buildUpiUri,
  canGiveCredit,
  canTransition,
  computeInvoice,
  currentConsent,
  daysOverdue,
  expiryAlerts,
  financialYear,
  formatQty,
  invoiceNumber,
  isStopWord,
  isValidGstin,
  isValidQty,
  isValidSlot,
  khataBalance,
  lowStock,
  maySend,
  nextStatuses,
  normalizeIndianPhone,
  primaryAction,
  priceCart,
  startOfDayIST,
  upcomingSlots,
  waMeLink,
  withRunningBalance,
  type CatalogProduct,
} from "./index";

const atta: CatalogProduct = {
  id: "atta",
  name: "Chakki Atta 5 kg",
  category: "Staples",
  unit: "pack",
  price: 26500,
  mrp: 28000,
  hsn: "1101",
  gstRateBp: 0,
  active: true,
  trackStock: true,
  stockMilli: 10_000,
  schedule: "none",
};
const sugar: CatalogProduct = { ...atta, id: "sugar", name: "Sugar (loose)", unit: "kg", price: 4600, hsn: "1701", gstRateBp: 500, trackStock: false };
const rxDrug: CatalogProduct = { ...atta, id: "amox", name: "Amoxicillin 500", schedule: "H", gstRateBp: 1200, hsn: "3004" };

describe("phone", () => {
  it("normalises Indian mobiles to E.164", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("5876543210")).toBeNull();
  });
});

describe("quantity", () => {
  it("allows whole pieces and 250 g steps for loose items", () => {
    expect(isValidQty("pc", 2000)).toBe(true);
    expect(isValidQty("pc", 1500)).toBe(false);
    expect(isValidQty("kg", 750)).toBe(true);
    expect(isValidQty("kg", 100)).toBe(false);
    expect(isValidQty("kg", 0)).toBe(false);
    expect(formatQty(250, "kg")).toBe("250 g");
    expect(formatQty(1500, "kg")).toBe("1.5 kg");
    expect(formatQty(3000, "pc")).toBe("3 pc");
  });
});

describe("cart pricing", () => {
  it("prices from the catalog and merges duplicates", () => {
    const r = priceCart([atta, sugar], [
      { productId: "atta", qtyMilli: 1000 },
      { productId: "sugar", qtyMilli: 1500 },
      { productId: "atta", qtyMilli: 1000 },
    ]);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0].amount).toBe(53000);
    expect(r.lines[1].amount).toBe(6900);
    expect(r.total).toBe(59900);
  });

  it("rejects scheduled drugs from QR but allows them at the counter", () => {
    expect(() => priceCart([rxDrug], [{ productId: "amox", qtyMilli: 1000 }])).toThrow(/prescription/);
    expect(priceCart([rxDrug], [{ productId: "amox", qtyMilli: 1000 }], { forCounter: true }).total).toBe(26500);
  });

  it("rejects unknown items, bad quantities and over-stock", () => {
    expect(() => priceCart([atta], [{ productId: "x", qtyMilli: 1000 }])).toThrow();
    expect(() => priceCart([atta], [{ productId: "atta", qtyMilli: 500 }])).toThrow(/quantity/);
    expect(() => priceCart([atta], [{ productId: "atta", qtyMilli: 11_000 }])).toThrow(/stock/);
    expect(() => priceCart([atta], [])).toThrow(/empty/);
  });
});

describe("GST invoice", () => {
  it("splits inclusive prices into taxable value, CGST and SGST", () => {
    const inv = computeInvoice(
      [
        { name: "Soap", hsn: "3401", qtyMilli: 2000, unitPrice: 5900, gstRateBp: 1800 },
        { name: "Atta", hsn: "1101", qtyMilli: 1000, unitPrice: 26500, gstRateBp: 0 },
      ],
      { composition: false },
    );
    expect(inv.kind).toBe("tax_invoice");
    const soap = inv.lines[0];
    expect(soap.total).toBe(11800);
    expect(soap.taxable).toBe(10000);
    expect(soap.cgst).toBe(900);
    expect(soap.sgst).toBe(900);
    expect(inv.total).toBe(38300);
    expect(inv.taxable + inv.cgst + inv.sgst).toBe(inv.total);
    expect(inv.summary).toHaveLength(2);
  });

  it("keeps odd paise consistent", () => {
    const inv = computeInvoice([{ name: "Biscuit", hsn: "1905", qtyMilli: 1000, unitPrice: 1000, gstRateBp: 1800 }], { composition: false });
    expect(inv.lines[0].taxable + inv.lines[0].cgst + inv.lines[0].sgst).toBe(1000);
  });

  it("issues a bill of supply for composition dealers", () => {
    const inv = computeInvoice([{ name: "Soap", hsn: "3401", qtyMilli: 1000, unitPrice: 5900, gstRateBp: 1800 }], { composition: true });
    expect(inv.kind).toBe("bill_of_supply");
    expect(inv.cgst + inv.sgst).toBe(0);
    expect(inv.summary).toEqual([]);
  });

  it("numbers invoices per Indian financial year", () => {
    expect(financialYear(Date.parse("2026-11-25T06:00:00Z"))).toBe("2026-27");
    expect(financialYear(Date.parse("2027-03-31T10:00:00Z"))).toBe("2026-27");
    expect(financialYear(Date.parse("2027-03-31T19:00:00Z"))).toBe("2027-28");
    const n = invoiceNumber(42, Date.parse("2026-11-25T06:00:00Z"));
    expect(n).toBe("SM/26-27/0042");
    expect(n.length).toBeLessThanOrEqual(16);
  });

  it("validates GSTIN", () => {
    expect(isValidGstin("27ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("27ABCDE1234F1X5")).toBe(false);
  });
});

describe("order status", () => {
  it("runs the delivery flow", () => {
    expect(nextStatuses("placed", "delivery")).toEqual(["accepted", "cancelled"]);
    expect(canTransition("packed", "out_for_delivery", "delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "cancelled", "delivery")).toBe(false);
    expect(canTransition("delivered", "placed", "delivery")).toBe(false);
  });

  it("skips out-for-delivery for pickup", () => {
    expect(canTransition("packed", "out_for_delivery", "pickup")).toBe(false);
    expect(primaryAction("packed", "pickup")).toEqual({ to: "delivered", label: "Picked up" });
    expect(primaryAction("delivered", "pickup")).toBeNull();
  });
});

describe("slots", () => {
  const hours = { openMinute: 8 * 60, closeMinute: 21 * 60, slotMinutes: 120 };
  it("lists future slots in IST with lead time", () => {
    const now = Date.parse("2026-11-25T04:45:00Z"); // 10:15 am IST
    const slots = upcomingSlots(now, hours);
    expect(slots[0].label).toBe("Today 12:00 pm to 2:00 pm");
    expect(slots.at(-1)?.label.startsWith("Tomorrow")).toBe(true);
    expect(isValidSlot(now, hours, slots[0].start)).toBe(true);
    expect(isValidSlot(now, hours, slots[0].start + 1)).toBe(false);
  });

  it("finds the IST day start", () => {
    expect(new Date(startOfDayIST(Date.parse("2026-11-25T20:00:00Z"))).toISOString()).toBe("2026-11-25T18:30:00.000Z");
  });
});

describe("khata", () => {
  const t = Date.parse("2026-11-01T06:00:00Z");
  const entries = [
    { kind: "credit" as const, amount: 50000, createdAt: t },
    { kind: "payment" as const, amount: 20000, createdAt: t + 86_400_000 },
    { kind: "credit" as const, amount: 12000, createdAt: t + 2 * 86_400_000 },
  ];
  it("computes balance and running balance", () => {
    expect(khataBalance(entries)).toBe(42000);
    expect(withRunningBalance(entries).map((e) => e.balance)).toEqual([50000, 30000, 42000]);
  });
  it("enforces khata switch and credit limit", () => {
    expect(canGiveCredit({ khataEnabled: false, balance: 0, creditLimit: 0, amount: 100 }).ok).toBe(false);
    expect(canGiveCredit({ khataEnabled: true, balance: 90000, creditLimit: 100000, amount: 20000 }).ok).toBe(false);
    expect(canGiveCredit({ khataEnabled: true, balance: 90000, creditLimit: 0, amount: 20000 }).ok).toBe(true);
  });
  it("counts days since last payment", () => {
    expect(daysOverdue(entries, t + 11 * 86_400_000)).toBe(10);
    expect(daysOverdue([], t)).toBeNull();
  });
});

describe("consent", () => {
  it("uses the latest record per purpose", () => {
    const c = currentConsent([
      { purpose: "service", granted: true, createdAt: 1 },
      { purpose: "marketing", granted: true, createdAt: 1 },
      { purpose: "marketing", granted: false, createdAt: 2 },
    ]);
    expect(c).toEqual({ service: true, marketing: false });
    expect(maySend("khata_reminder", c)).toBe(true);
    expect(maySend("offer", c)).toBe(false);
    expect(maySend("order_update", { service: false, marketing: true })).toBe(false);
  });
  it("recognises STOP replies", () => {
    expect(isStopWord(" Stop ")).toBe(true);
    expect(isStopWord("stop sending atta")).toBe(false);
  });
});

describe("inventory", () => {
  it("lists low stock and expiry alerts", () => {
    const items = [
      { id: "a", name: "A", trackStock: true, stockMilli: 1000, minStockMilli: 5000 },
      { id: "b", name: "B", trackStock: true, stockMilli: 9000, minStockMilli: 5000 },
      { id: "c", name: "C", trackStock: false, stockMilli: 0, minStockMilli: 5000 },
    ];
    expect(lowStock(items).map((i) => i.id)).toEqual(["a"]);
    const alerts = expiryAlerts(
      [
        { id: "1", productId: "a", productName: "A", batchNo: "X1", expiry: "2026-11-20", qtyMilli: 1000 },
        { id: "2", productId: "a", productName: "A", batchNo: "X2", expiry: "2026-12-10", qtyMilli: 1000 },
        { id: "3", productId: "a", productName: "A", batchNo: "X3", expiry: "2027-06-10", qtyMilli: 1000 },
        { id: "4", productId: "a", productName: "A", batchNo: "X4", expiry: "2026-11-01", qtyMilli: 0 },
      ],
      "2026-11-25",
    );
    expect(alerts.map((a) => [a.id, a.state, a.daysLeft])).toEqual([
      ["1", "expired", -5],
      ["2", "expiring", 15],
    ]);
  });
});

describe("dashboard", () => {
  it("summarises sales, credit, top items and repeat customers", () => {
    const now = Date.parse("2026-11-25T08:00:00Z");
    const item = (productId: string, amount: number) => ({ productId, name: productId, qtyMilli: 1000, amount });
    const d = buildDashboard({
      now,
      sales: [
        { customerId: "c1", total: 10000, at: now - 1000, items: [item("atta", 10000)] },
        { customerId: "c1", total: 5000, at: now - 3 * 86_400_000, items: [item("milk", 5000)] },
        { customerId: "c2", total: 2000, at: now - 2000, items: [item("milk", 2000)] },
        { customerId: null, total: 4000, at: now - 3000, items: [item("soap", 4000)] },
      ],
      khata: [
        { kind: "credit", amount: 30000, createdAt: now - 40 * 86_400_000 },
        { kind: "payment", amount: 10000, createdAt: now - 1000 },
      ],
    });
    expect(d.salesToday).toBe(16000);
    expect(d.billsToday).toBe(3);
    expect(d.creditOutstanding).toBe(20000);
    expect(d.recoveredThisMonth).toBe(10000);
    expect(d.topItems[0].productId).toBe("atta");
    expect(d.repeatCustomers).toBe(1);
    expect(d.activeCustomers).toBe(2);
    expect(d.daily).toHaveLength(7);
  });
});

describe("links", () => {
  it("builds wa.me and UPI links", () => {
    expect(waMeLink("+919876543210", "Hi there")).toBe("https://wa.me/919876543210?text=Hi%20there");
    expect(buildUpiUri({ vpa: "demo@upi", payeeName: "Demo Store", amount: 12050 })).toContain("am=120.50");
  });
});
