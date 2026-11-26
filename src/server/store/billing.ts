import { and, desc, eq } from "drizzle-orm";
import { CartError, canGiveCredit, computeInvoice, invoiceNumber, khataBalance, priceCart, type CartLineInput, type Unit } from "@/domain";
import { schema } from "../db";
import { StoreError, newId, type Ctx, type Q } from "./core";
import { loadOrg, loadProducts, moveStock, nextSeq, toCatalog, upsertCustomerByPhone, type CustomerRow } from "./shared";

export type BillPayment = "cash" | "upi" | "khata";

interface InvoiceLineIn {
  productId: string;
  name: string;
  unit: Unit;
  hsn: string;
  qtyMilli: number;
  unitPrice: number;
  gstRateBp: number;
}

export async function customerBalance(q: Q, orgId: string, customerId: string): Promise<number> {
  const entries = await q
    .select()
    .from(schema.khataEntries)
    .where(and(eq(schema.khataEntries.orgId, orgId), eq(schema.khataEntries.customerId, customerId)));
  return khataBalance(entries.map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: 0 })));
}

/** Create the invoice rows (and a khata credit for khata bills) inside a transaction. */
export async function createInvoiceTx(
  tx: Q,
  ctx: Ctx,
  p: {
    lines: InvoiceLineIn[];
    customer?: CustomerRow;
    paymentMode: BillPayment;
    orderId?: string;
    now: number;
    skipStock?: boolean;
    skipCreditCheck?: boolean;
  },
) {
  const org = await loadOrg(tx, ctx.orgId);
  const totals = computeInvoice(p.lines, { composition: org.composition });
  if (p.paymentMode === "khata") {
    if (!p.customer) throw new StoreError("Pick a customer to bill on khata");
    if (!p.skipCreditCheck) {
      const check = canGiveCredit({
        khataEnabled: p.customer.khataEnabled,
        balance: await customerBalance(tx, ctx.orgId, p.customer.id),
        creditLimit: p.customer.creditLimitPaise,
        amount: totals.total,
      });
      if (!check.ok) throw new StoreError(check.reason!, 409);
    }
  }
  const seq = await nextSeq(tx, ctx.orgId, "invoiceSeq");
  const id = newId();
  await tx.insert(schema.invoices).values({
    id,
    orgId: ctx.orgId,
    number: invoiceNumber(seq, p.now),
    kind: totals.kind,
    customerId: p.customer?.id ?? null,
    customerName: p.customer?.name ?? "",
    customerPhone: p.customer?.phone ?? "",
    orderId: p.orderId ?? null,
    paymentMode: p.paymentMode,
    taxablePaise: totals.taxable,
    cgstPaise: totals.cgst,
    sgstPaise: totals.sgst,
    totalPaise: totals.total,
    createdBy: ctx.userId,
    createdAt: new Date(p.now),
  });
  await tx.insert(schema.invoiceItems).values(
    totals.lines.map((l, i) => ({
      id: newId(),
      orgId: ctx.orgId,
      invoiceId: id,
      productId: p.lines[i].productId,
      name: l.name,
      hsn: l.hsn,
      unit: p.lines[i].unit,
      qtyMilli: l.qtyMilli,
      unitPricePaise: l.unitPrice,
      gstRateBp: l.gstRateBp,
      taxablePaise: l.taxable,
      cgstPaise: l.cgst,
      sgstPaise: l.sgst,
      totalPaise: l.total,
    })),
  );
  if (!p.skipStock) await moveStock(tx, ctx.orgId, p.lines, -1);
  if (p.paymentMode === "khata" && p.customer) {
    await tx.insert(schema.khataEntries).values({
      id: newId(),
      orgId: ctx.orgId,
      customerId: p.customer.id,
      kind: "credit",
      amountPaise: totals.total,
      method: p.orderId ? "order" : "bill",
      orderId: p.orderId ?? null,
      invoiceId: id,
      note: `Bill ${invoiceNumber(seq, p.now)}`,
      createdBy: ctx.userId,
      createdAt: new Date(p.now),
    });
  }
  return { id, number: invoiceNumber(seq, p.now), total: totals.total };
}

/** Counter billing: price from the catalog (scheduled drugs allowed at the counter), then invoice. */
export async function createBill(
  ctx: Ctx,
  input: { lines: CartLineInput[]; paymentMode: BillPayment; customerPhone?: string; customerName?: string },
  now = Date.now(),
) {
  return ctx.db.transaction(async (tx) => {
    const catalog = (await loadProducts(tx, ctx.orgId)).map(toCatalog);
    let priced;
    try {
      priced = priceCart(catalog, input.lines, { forCounter: true });
    } catch (e) {
      if (e instanceof CartError) throw new StoreError(e.message, 409);
      throw e;
    }
    const customer = input.customerPhone
      ? await upsertCustomerByPhone(tx, ctx.orgId, input.customerPhone, { name: input.customerName })
      : undefined;
    return createInvoiceTx(tx, ctx, {
      lines: priced.lines.map((l) => ({ productId: l.productId, name: l.name, unit: l.unit, hsn: l.hsn, qtyMilli: l.qtyMilli, unitPrice: l.unitPrice, gstRateBp: l.gstRateBp })),
      customer,
      paymentMode: input.paymentMode,
      now,
    });
  });
}

export async function getInvoice(ctx: Ctx, id: string) {
  const [inv] = await ctx.db.select().from(schema.invoices).where(and(eq(schema.invoices.orgId, ctx.orgId), eq(schema.invoices.id, id)));
  if (!inv) throw new StoreError("Invoice not found", 404);
  const items = await ctx.db.select().from(schema.invoiceItems).where(and(eq(schema.invoiceItems.orgId, ctx.orgId), eq(schema.invoiceItems.invoiceId, id)));
  const org = await loadOrg(ctx.db, ctx.orgId);
  const summary = computeInvoice(
    items.map((i) => ({ name: i.name, hsn: i.hsn, qtyMilli: i.qtyMilli, unitPrice: i.unitPricePaise, gstRateBp: i.gstRateBp })),
    { composition: inv.kind === "bill_of_supply" },
  ).summary;
  return {
    invoice: { ...inv, createdAt: inv.createdAt.getTime() },
    items,
    summary,
    store: { name: org.name, address: org.address, city: org.city, gstin: org.gstin, phone: org.whatsappPhone, isDemo: org.isDemo, upi: org.upiVpa },
  };
}

export async function listInvoices(ctx: Ctx, limit = 30) {
  const rows = await ctx.db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.orgId, ctx.orgId))
    .orderBy(desc(schema.invoices.createdAt))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, number: r.number, total: r.totalPaise, paymentMode: r.paymentMode, customerName: r.customerName, createdAt: r.createdAt.getTime() }));
}
