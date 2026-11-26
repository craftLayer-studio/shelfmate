import { and, asc, eq, sql } from "drizzle-orm";
import {
  CONSENT_PURPOSES,
  NOTICE_VERSION,
  currentConsent,
  maySend,
  type CatalogProduct,
  type ConsentChannel,
  type ConsentPurpose,
  type MessageKind,
} from "@/domain";
import { schema } from "../db";
import { messaging, recordSkipped } from "./messaging";
import { StoreError, newId, newToken, type Q } from "./core";

export type OrgRow = typeof schema.orgs.$inferSelect;
export type ProductRow = typeof schema.products.$inferSelect;
export type CustomerRow = typeof schema.customers.$inferSelect;

export async function loadOrg(q: Q, orgId: string): Promise<OrgRow> {
  const [org] = await q.select().from(schema.orgs).where(eq(schema.orgs.id, orgId));
  if (!org) throw new StoreError("Store not found", 404);
  return org;
}

export function toCatalog(p: ProductRow): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    price: p.pricePaise,
    mrp: p.mrpPaise,
    hsn: p.hsn,
    gstRateBp: p.gstRateBp,
    active: p.active,
    trackStock: p.trackStock,
    stockMilli: p.stockMilli,
    schedule: p.schedule,
  };
}

export async function loadProducts(q: Q, orgId: string): Promise<ProductRow[]> {
  return q.select().from(schema.products).where(eq(schema.products.orgId, orgId)).orderBy(asc(schema.products.category), asc(schema.products.name));
}

export async function consentOf(q: Q, orgId: string, customerId: string): Promise<Record<ConsentPurpose, boolean>> {
  const rows = await q
    .select()
    .from(schema.consentRecords)
    .where(and(eq(schema.consentRecords.orgId, orgId), eq(schema.consentRecords.customerId, customerId)));
  return currentConsent(rows.map((r) => ({ purpose: r.purpose, granted: r.granted, createdAt: r.createdAt.getTime() })));
}

/** Append a consent record (never update in place: the log is the evidence). */
export async function recordConsent(
  q: Q,
  orgId: string,
  customerId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  channel: ConsentChannel,
): Promise<void> {
  await q.insert(schema.consentRecords).values({ id: newId(), orgId, customerId, purpose, granted, channel, noticeVersion: NOTICE_VERSION });
}

/** Opt out of everything (STOP). */
export async function withdrawAll(q: Q, orgId: string, customerId: string, channel: ConsentChannel): Promise<void> {
  const now = await consentOf(q, orgId, customerId);
  for (const p of CONSENT_PURPOSES) if (now[p]) await recordConsent(q, orgId, customerId, p, false, channel);
}

/** Find a customer by phone or create one. Name and address are refreshed when given. */
export async function upsertCustomerByPhone(
  q: Q,
  orgId: string,
  phone: string,
  data: { name?: string; address?: string },
): Promise<CustomerRow> {
  const [existing] = await q
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.orgId, orgId), eq(schema.customers.phone, phone)));
  if (existing) {
    const patch: Partial<CustomerRow> = {};
    if (data.name) patch.name = data.name;
    if (data.address) patch.address = data.address;
    if (Object.keys(patch).length === 0) return existing;
    const [row] = await q.update(schema.customers).set(patch).where(eq(schema.customers.id, existing.id)).returning();
    return row;
  }
  const [row] = await q
    .insert(schema.customers)
    .values({ id: newId(), orgId, phone, name: data.name || "Customer", address: data.address ?? "", publicToken: newToken() })
    .returning();
  return row;
}

/** Send to a customer through the messaging adapter, only if they consented to that purpose. */
export async function sendToCustomer(
  q: Q,
  params: { orgId: string; customer: CustomerRow; kind: MessageKind; body: string; campaignId?: string },
): Promise<boolean> {
  const consent = await consentOf(q, params.orgId, params.customer.id);
  const msg = { orgId: params.orgId, toPhone: params.customer.phone, customerId: params.customer.id, kind: params.kind, body: params.body, campaignId: params.campaignId };
  if (!maySend(params.kind, consent)) {
    await recordSkipped(q, msg, params.kind === "offer" ? "No marketing consent" : "No consent for service messages");
    return false;
  }
  await messaging().send(q, msg, "whatsapp");
  return true;
}

/** Move stock up or down for tracked products (never below zero). */
export async function moveStock(q: Q, orgId: string, lines: { productId: string; qtyMilli: number }[], sign: 1 | -1): Promise<void> {
  for (const l of lines) {
    const [p] = await q.select().from(schema.products).where(and(eq(schema.products.orgId, orgId), eq(schema.products.id, l.productId)));
    if (!p || !p.trackStock) continue;
    await q
      .update(schema.products)
      .set({ stockMilli: Math.max(0, p.stockMilli + sign * l.qtyMilli) })
      .where(eq(schema.products.id, p.id));
  }
}

export async function nextSeq(q: Q, orgId: string, col: "orderSeq" | "invoiceSeq"): Promise<number> {
  const column = schema.orgs[col];
  const [row] = await q
    .update(schema.orgs)
    .set({ [col]: sql`${column} + 1` })
    .where(eq(schema.orgs.id, orgId))
    .returning({ value: column });
  if (!row) throw new StoreError("Store not found", 404);
  return row.value;
}
