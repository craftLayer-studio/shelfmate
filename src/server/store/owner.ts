import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import QRCode from "qrcode";
import { DAY_MS, buildDashboard, startOfDayIST, isValidGstin, isValidVpa, offerText, type SaleLike } from "@/domain";
import { schema } from "../db";
import { StoreError, newId, requireOwner, type Ctx } from "./core";
import { loadOrg, sendToCustomer } from "./shared";
import { catalogUrl } from "./public";

/**
 * Owner dashboard. A sale is a counter bill, or an order that was not cancelled.
 * Delivered orders already have an invoice, so they are counted once (from the order).
 */
export async function getDashboard(ctx: Ctx, now = Date.now()) {
  requireOwner(ctx);
  const since = new Date(now - 40 * DAY_MS);
  const [orders, orderItems, invoices, invoiceItems, khata, outbox, campaigns] = await Promise.all([
    ctx.db.select().from(schema.orders).where(and(eq(schema.orders.orgId, ctx.orgId), ne(schema.orders.status, "cancelled"), gte(schema.orders.createdAt, since))),
    ctx.db.select().from(schema.orderItems).where(eq(schema.orderItems.orgId, ctx.orgId)),
    ctx.db.select().from(schema.invoices).where(and(eq(schema.invoices.orgId, ctx.orgId), gte(schema.invoices.createdAt, since))),
    ctx.db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.orgId, ctx.orgId)),
    ctx.db.select().from(schema.khataEntries).where(eq(schema.khataEntries.orgId, ctx.orgId)),
    ctx.db.select().from(schema.outbox).where(and(eq(schema.outbox.orgId, ctx.orgId), gte(schema.outbox.createdAt, since))),
    ctx.db.select().from(schema.campaigns).where(eq(schema.campaigns.orgId, ctx.orgId)).orderBy(desc(schema.campaigns.createdAt)).limit(5),
  ]);
  const sales: SaleLike[] = [
    ...orders.map((o) => ({
      customerId: o.customerId,
      total: o.totalPaise,
      at: o.createdAt.getTime(),
      items: orderItems.filter((i) => i.orderId === o.id).map((i) => ({ productId: i.productId, name: i.name, qtyMilli: i.qtyMilli, amount: i.amountPaise })),
    })),
    ...invoices
      .filter((inv) => !inv.orderId)
      .map((inv) => ({
        customerId: inv.customerId,
        total: inv.totalPaise,
        at: inv.createdAt.getTime(),
        items: invoiceItems.filter((i) => i.invoiceId === inv.id).map((i) => ({ productId: i.productId, name: i.name, qtyMilli: i.qtyMilli, amount: i.totalPaise })),
      })),
  ];
  const d = buildDashboard({ now, sales, khata: khata.map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: e.createdAt.getTime() })) });
  const today = startOfDayIST(now);
  const qrOrdersToday = orders.filter((o) => o.createdAt.getTime() >= today).length;
  const reminders = outbox.filter((m) => m.kind === "khata_reminder");

  // Campaign results: orders placed by recipients after the send.
  const campaignResults = campaigns.map((c) => {
    const recipients = new Set(outbox.filter((m) => m.campaignId === c.id && m.status === "sent").map((m) => m.customerId));
    const resulting = orders.filter((o) => recipients.has(o.customerId) && o.createdAt > c.createdAt);
    return { id: c.id, message: c.message, sent: c.sentCount, skipped: c.skippedCount, orders: resulting.length, revenue: resulting.reduce((a, o) => a + o.totalPaise, 0), createdAt: c.createdAt.getTime() };
  });
  return {
    ...d,
    qrOrdersToday,
    remindersSent30d: reminders.filter((m) => m.status === "sent").length,
    messagesSkipped30d: outbox.filter((m) => m.status === "skipped").length,
    campaigns: campaignResults,
  };
}

export async function sendCampaign(ctx: Ctx, input: { message: string; segment: "all" | "inactive_21d" }, now = Date.now()) {
  requireOwner(ctx);
  return ctx.db.transaction(async (tx) => {
    const org = await loadOrg(tx, ctx.orgId);
    let customers = await tx.select().from(schema.customers).where(eq(schema.customers.orgId, ctx.orgId));
    if (input.segment === "inactive_21d") {
      const recent = await tx
        .select({ customerId: schema.orders.customerId })
        .from(schema.orders)
        .where(and(eq(schema.orders.orgId, ctx.orgId), gte(schema.orders.createdAt, new Date(now - 21 * DAY_MS))));
      const active = new Set(recent.map((r) => r.customerId));
      customers = customers.filter((c) => !active.has(c.id));
    }
    const id = newId();
    await tx.insert(schema.campaigns).values({ id, orgId: ctx.orgId, message: input.message, segment: input.segment, createdAt: new Date(now) });
    let sent = 0;
    let skipped = 0;
    for (const c of customers) {
      const ok = await sendToCustomer(tx, { orgId: ctx.orgId, customer: c, kind: "offer", body: offerText({ store: org.name, message: input.message, catalogUrl: catalogUrl(org) }), campaignId: id });
      if (ok) sent++;
      else skipped++;
    }
    await tx.update(schema.campaigns).set({ sentCount: sent, skippedCount: skipped }).where(eq(schema.campaigns.id, id));
    return { id, sent, skipped };
  });
}

export async function listOutbox(ctx: Ctx, limit = 60) {
  const rows = await ctx.db.select().from(schema.outbox).where(eq(schema.outbox.orgId, ctx.orgId)).orderBy(desc(schema.outbox.createdAt)).limit(limit);
  return rows.map((m) => ({ id: m.id, kind: m.kind, toPhone: m.toPhone, body: m.body, status: m.status, reason: m.reason, channel: m.channel, createdAt: m.createdAt.getTime() }));
}

export async function getSettings(ctx: Ctx) {
  requireOwner(ctx);
  const org = await loadOrg(ctx.db, ctx.orgId);
  const staff = await ctx.db.select().from(schema.staffUsers).where(eq(schema.staffUsers.orgId, ctx.orgId));
  return { org, catalogUrl: catalogUrl(org), staff: staff.map((s) => ({ id: s.id, name: s.name, phone: s.phone, role: s.role })) };
}

export interface SettingsInput {
  name: string;
  address: string;
  city: string;
  whatsappPhone: string;
  upiVpa: string;
  gstin: string | null;
  composition: boolean;
  deliveryRadiusKm: number;
  minOrder: number;
  openMinute: number;
  closeMinute: number;
  slotMinutes: number;
}

export async function updateSettings(ctx: Ctx, s: SettingsInput) {
  requireOwner(ctx);
  if (!isValidVpa(s.upiVpa)) throw new StoreError("Enter a valid UPI ID, like shop@okbank");
  if (s.gstin && !isValidGstin(s.gstin)) throw new StoreError("GSTIN format looks wrong");
  if (s.openMinute < 0 || s.closeMinute > 24 * 60 || s.closeMinute <= s.openMinute) throw new StoreError("Closing time must be after opening time");
  if (![30, 60, 120].includes(s.slotMinutes)) throw new StoreError("Slot must be 30, 60 or 120 minutes");
  if (s.deliveryRadiusKm < 0 || s.deliveryRadiusKm > 20) throw new StoreError("Delivery radius must be 0 to 20 km");
  await ctx.db
    .update(schema.orgs)
    .set({
      name: s.name,
      address: s.address,
      city: s.city,
      whatsappPhone: s.whatsappPhone,
      upiVpa: s.upiVpa,
      gstin: s.gstin,
      composition: s.composition,
      deliveryRadiusKm: s.deliveryRadiusKm,
      minOrderPaise: s.minOrder,
      openMinute: s.openMinute,
      closeMinute: s.closeMinute,
      slotMinutes: s.slotMinutes,
    })
    .where(eq(schema.orgs.id, ctx.orgId));
  return { ok: true };
}

/** Printable QR sheet data: the catalog URL as an SVG QR code. */
export async function getQrSheet(ctx: Ctx) {
  requireOwner(ctx);
  const org = await loadOrg(ctx.db, ctx.orgId);
  const url = catalogUrl(org);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return { name: org.name, url, svg, isDemo: org.isDemo, upi: org.upiVpa };
}

export async function staffNames(ctx: Ctx, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await ctx.db.select().from(schema.staffUsers).where(and(eq(schema.staffUsers.orgId, ctx.orgId), inArray(schema.staffUsers.id, ids)));
  return new Map(rows.map((r) => [r.id, r.name]));
}
