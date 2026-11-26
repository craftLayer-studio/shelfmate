import { and, asc, desc, eq } from "drizzle-orm";
import {
  CartError,
  PAYMENT_LABELS,
  buildUpiUri,
  canGiveCredit,
  formatQty,
  isOrderable,
  isValidSlot,
  khataBalance,
  orderPlacedText,
  orderToStoreText,
  priceCart,
  statusLabel,
  upcomingSlots,
  waMeLink,
  withRunningBalance,
  type CartLineInput,
  type ConsentPurpose,
  type Fulfilment,
  type PaymentMode,
} from "@/domain";
import { appUrl, isDemoMode } from "../config";
import { schema, type Db } from "../db";
import { StoreError, newId, newToken, type Q } from "./core";
import {
  consentOf,
  loadOrg,
  loadProducts,
  moveStock,
  nextSeq,
  recordConsent,
  sendToCustomer,
  toCatalog,
  upsertCustomerByPhone,
  withdrawAll,
  type OrgRow,
} from "./shared";
import { payments } from "./payments";

async function orgByQr(q: Q, qrToken: string): Promise<OrgRow> {
  const [org] = await q.select().from(schema.orgs).where(eq(schema.orgs.qrToken, qrToken));
  if (!org) throw new StoreError("This QR code is not linked to a store", 404);
  return org;
}

const hoursOf = (org: OrgRow) => ({ openMinute: org.openMinute, closeMinute: org.closeMinute, slotMinutes: org.slotMinutes });

export const catalogUrl = (org: OrgRow) => `${appUrl()}/s/${org.qrToken}`;
export const trackUrl = (token: string) => `${appUrl()}/o/${token}`;
export const statementUrl = (token: string) => `${appUrl()}/k/${token}`;

/** Everything the public QR catalog page needs. No customer data. */
export async function getStorefront(db: Db, qrToken: string, now = Date.now()) {
  const org = await orgByQr(db, qrToken);
  const products = (await loadProducts(db, org.id)).filter((p) => p.active && p.schedule === "none");
  return {
    store: {
      name: org.name,
      address: org.address,
      city: org.city,
      isDemo: org.isDemo,
      deliveryRadiusKm: org.deliveryRadiusKm,
      minOrder: org.minOrderPaise,
      upi: org.upiVpa,
    },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      price: p.pricePaise,
      mrp: p.mrpPaise,
      available: isOrderable(toCatalog(p)),
    })),
    slots: upcomingSlots(now, hoursOf(org)),
  };
}

export interface PlaceOrderInput {
  name: string;
  phone: string;
  address: string;
  fulfilment: Fulfilment;
  slotStart: number;
  paymentMode: PaymentMode;
  note: string;
  lines: CartLineInput[];
  consentService: boolean;
  consentMarketing: boolean;
}

/** Customer places an order from the QR catalog. Prices and totals are computed here, never trusted. */
export async function placeOrder(db: Db, qrToken: string, input: PlaceOrderInput, now = Date.now()) {
  return db.transaction(async (tx) => {
    const org = await orgByQr(tx, qrToken);
    if (!isValidSlot(now, hoursOf(org), input.slotStart)) throw new StoreError("Please pick an available time slot");
    if (input.fulfilment === "delivery" && input.address.trim().length < 5) throw new StoreError("Please enter your delivery address");
    const catalog = (await loadProducts(tx, org.id)).map(toCatalog);
    let priced;
    try {
      priced = priceCart(catalog, input.lines);
    } catch (e) {
      if (e instanceof CartError) throw new StoreError(e.message, 409);
      throw e;
    }
    if (priced.total < org.minOrderPaise) throw new StoreError("Order is below the store's minimum");

    const customer = await upsertCustomerByPhone(tx, org.id, input.phone, { name: input.name, address: input.address });
    if (input.consentService) await recordConsent(tx, org.id, customer.id, "service", true, "qr");
    if (input.consentMarketing) await recordConsent(tx, org.id, customer.id, "marketing", true, "qr");

    if (input.paymentMode === "khata") {
      const entries = await tx
        .select()
        .from(schema.khataEntries)
        .where(and(eq(schema.khataEntries.orgId, org.id), eq(schema.khataEntries.customerId, customer.id)));
      const balance = khataBalance(entries.map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: e.createdAt.getTime() })));
      const check = canGiveCredit({ khataEnabled: customer.khataEnabled, balance, creditLimit: customer.creditLimitPaise, amount: priced.total });
      if (!check.ok) throw new StoreError(`${check.reason}. Please choose cash or UPI.`, 409);
    }

    const number = await nextSeq(tx, org.id, "orderSeq");
    const orderId = newId();
    const token = newToken();
    const slot = upcomingSlots(now, hoursOf(org)).find((s) => s.start === input.slotStart)!;
    await tx.insert(schema.orders).values({
      id: orderId,
      orgId: org.id,
      number,
      customerId: customer.id,
      publicToken: token,
      fulfilment: input.fulfilment,
      slotStart: new Date(slot.start),
      slotEnd: new Date(slot.end),
      address: input.fulfilment === "delivery" ? input.address : "",
      note: input.note,
      paymentMode: input.paymentMode,
      status: "placed",
      totalPaise: priced.total,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    await tx.insert(schema.orderItems).values(
      priced.lines.map((l) => ({
        id: newId(),
        orgId: org.id,
        orderId,
        productId: l.productId,
        name: l.name,
        unit: l.unit,
        qtyMilli: l.qtyMilli,
        unitPricePaise: l.unitPrice,
        amountPaise: l.amount,
        hsn: l.hsn,
        gstRateBp: l.gstRateBp,
      })),
    );
    await tx.insert(schema.orderEvents).values({ id: newId(), orgId: org.id, orderId, status: "placed", createdAt: new Date(now) });
    await moveStock(tx, org.id, priced.lines, -1);
    await sendToCustomer(tx, {
      orgId: org.id,
      customer,
      kind: "order_update",
      body: orderPlacedText({ store: org.name, number, total: priced.total, trackUrl: trackUrl(token) }),
    });
    const storeText = orderToStoreText({
      number,
      name: customer.name,
      lines: priced.lines.map((l) => ({ name: l.name, qty: formatQty(l.qtyMilli, l.unit) })),
      total: priced.total,
      fulfilment: input.fulfilment === "delivery" ? "Home delivery" : "Pickup",
      slot: slot.label,
      payment: PAYMENT_LABELS[input.paymentMode],
    });
    return { token, number, total: priced.total, whatsappLink: waMeLink(org.whatsappPhone, storeText) };
  });
}

/** Public order tracking page. */
export async function getOrderPublic(db: Db, token: string) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.publicToken, token));
  if (!order) throw new StoreError("Order not found", 404);
  const org = await loadOrg(db, order.orgId);
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(and(eq(schema.orderItems.orgId, order.orgId), eq(schema.orderItems.orderId, order.id)));
  const events = await db
    .select()
    .from(schema.orderEvents)
    .where(and(eq(schema.orderEvents.orgId, order.orgId), eq(schema.orderEvents.orderId, order.id)))
    .orderBy(asc(schema.orderEvents.createdAt));
  const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, order.customerId));
  const upiLink =
    order.paymentMode === "upi" && !order.paid && order.status !== "cancelled"
      ? buildUpiUri({ vpa: org.upiVpa, payeeName: org.name, amount: order.totalPaise, note: `Order ${order.number}`, reference: `SM${order.number}` })
      : null;
  return {
    store: { name: org.name, isDemo: org.isDemo, phone: org.whatsappPhone, catalogToken: org.qrToken },
    order: {
      number: order.number,
      status: order.status,
      statusLabel: statusLabel(order.status, order.fulfilment),
      fulfilment: order.fulfilment,
      slotStart: order.slotStart.getTime(),
      slotEnd: order.slotEnd.getTime(),
      paymentMode: order.paymentMode,
      paid: order.paid,
      total: order.totalPaise,
      createdAt: order.createdAt.getTime(),
    },
    items: items.map((i) => ({ name: i.name, qty: formatQty(i.qtyMilli, i.unit), amount: i.amountPaise })),
    events: events.map((e) => ({ status: e.status, at: e.createdAt.getTime() })),
    upiLink,
    statementToken: customer?.publicToken ?? null,
  };
}

async function customerByToken(q: Q, token: string) {
  const [c] = await q.select().from(schema.customers).where(eq(schema.customers.publicToken, token));
  if (!c) throw new StoreError("Link not found", 404);
  return c;
}

/** Customer's khata statement and message preferences, opened from a reminder link. */
export async function getStatement(db: Db, token: string) {
  const c = await customerByToken(db, token);
  const org = await loadOrg(db, c.orgId);
  const entries = await db
    .select()
    .from(schema.khataEntries)
    .where(and(eq(schema.khataEntries.orgId, c.orgId), eq(schema.khataEntries.customerId, c.id)))
    .orderBy(desc(schema.khataEntries.createdAt));
  const list = withRunningBalance(entries.map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: e.createdAt.getTime(), note: e.note, method: e.method })));
  const balance = khataBalance(list);
  return {
    store: { name: org.name, isDemo: org.isDemo, catalogToken: org.qrToken },
    customer: { name: c.name },
    balance,
    entries: list.reverse().slice(0, 50),
    upiLink: balance > 0 ? buildUpiUri({ vpa: org.upiVpa, payeeName: org.name, amount: balance, note: "Khata payment" }) : null,
    consent: await consentOf(db, c.orgId, c.id),
    demoPayments: isDemoMode(),
  };
}

export async function setConsentPublic(db: Db, token: string, purpose: ConsentPurpose, granted: boolean) {
  return db.transaction(async (tx) => {
    const c = await customerByToken(tx, token);
    await recordConsent(tx, c.orgId, c.id, purpose, granted, "statement");
    return consentOf(tx, c.orgId, c.id);
  });
}

export async function stopAllPublic(db: Db, token: string) {
  return db.transaction(async (tx) => {
    const c = await customerByToken(tx, token);
    await withdrawAll(tx, c.orgId, c.id, "statement");
    return consentOf(tx, c.orgId, c.id);
  });
}

/**
 * Pay the khata balance through the payment adapter. In the MVP the simulated adapter confirms
 * immediately (demo only); a real gateway would confirm by webhook and call `recordKhataPayment`.
 */
export async function payStatement(db: Db, token: string, amount: number) {
  if (!isDemoMode()) throw new StoreError("Online payment confirmation needs a payment gateway", 501);
  return db.transaction(async (tx) => {
    const c = await customerByToken(tx, token);
    const entries = await tx
      .select()
      .from(schema.khataEntries)
      .where(and(eq(schema.khataEntries.orgId, c.orgId), eq(schema.khataEntries.customerId, c.id)));
    const balance = khataBalance(entries.map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: 0 })));
    if (!Number.isInteger(amount) || amount <= 0 || amount > balance) throw new StoreError("Amount must be between ₹0.01 and your balance");
    const result = await payments().confirm({ amount, reference: `KH-${c.id.slice(0, 8)}` });
    if (!result.ok) throw new StoreError("Payment failed", 402);
    await tx.insert(schema.khataEntries).values({
      id: newId(),
      orgId: c.orgId,
      customerId: c.id,
      kind: "payment",
      amountPaise: amount,
      method: "upi",
      note: `UPI ${result.reference} (${payments().name})`,
    });
    return { paid: amount, balance: balance - amount };
  });
}
