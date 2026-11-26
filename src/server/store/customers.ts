import { and, desc, eq } from "drizzle-orm";
import { currentConsent, daysOverdue, khataBalance, khataReminderText, withRunningBalance, type ConsentPurpose } from "@/domain";
import { schema } from "../db";
import { StoreError, newId, type Ctx } from "./core";
import { consentOf, loadOrg, recordConsent, sendToCustomer, upsertCustomerByPhone, withdrawAll } from "./shared";
import { statementUrl } from "./public";

/** Customer list with khata balance, consent state and order count. */
export async function listCustomers(ctx: Ctx, now = Date.now()) {
  const [customers, entries, consents, orders] = await Promise.all([
    ctx.db.select().from(schema.customers).where(eq(schema.customers.orgId, ctx.orgId)),
    ctx.db.select().from(schema.khataEntries).where(eq(schema.khataEntries.orgId, ctx.orgId)),
    ctx.db.select().from(schema.consentRecords).where(eq(schema.consentRecords.orgId, ctx.orgId)),
    ctx.db.select({ customerId: schema.orders.customerId }).from(schema.orders).where(eq(schema.orders.orgId, ctx.orgId)),
  ]);
  return customers
    .map((c) => {
      const mine = entries.filter((e) => e.customerId === c.id).map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: e.createdAt.getTime() }));
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        khataEnabled: c.khataEnabled,
        creditLimit: c.creditLimitPaise,
        balance: khataBalance(mine),
        daysOverdue: daysOverdue(mine, now),
        orders: orders.filter((o) => o.customerId === c.id).length,
        consent: currentConsent(
          consents.filter((r) => r.customerId === c.id).map((r) => ({ purpose: r.purpose, granted: r.granted, createdAt: r.createdAt.getTime() })),
        ),
      };
    })
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

async function loadCustomer(ctx: Ctx, id: string) {
  const [c] = await ctx.db.select().from(schema.customers).where(and(eq(schema.customers.orgId, ctx.orgId), eq(schema.customers.id, id)));
  if (!c) throw new StoreError("Customer not found", 404);
  return c;
}

export async function getCustomer(ctx: Ctx, id: string, now = Date.now()) {
  const c = await loadCustomer(ctx, id);
  const [entries, consentLog, messages] = await Promise.all([
    ctx.db.select().from(schema.khataEntries).where(and(eq(schema.khataEntries.orgId, ctx.orgId), eq(schema.khataEntries.customerId, id))),
    ctx.db
      .select()
      .from(schema.consentRecords)
      .where(and(eq(schema.consentRecords.orgId, ctx.orgId), eq(schema.consentRecords.customerId, id)))
      .orderBy(desc(schema.consentRecords.createdAt)),
    ctx.db
      .select()
      .from(schema.outbox)
      .where(and(eq(schema.outbox.orgId, ctx.orgId), eq(schema.outbox.customerId, id)))
      .orderBy(desc(schema.outbox.createdAt))
      .limit(10),
  ]);
  const ledger = withRunningBalance(
    entries.map((e) => ({ id: e.id, kind: e.kind, amount: e.amountPaise, createdAt: e.createdAt.getTime(), note: e.note, method: e.method, invoiceId: e.invoiceId })),
  ).reverse();
  return {
    customer: { id: c.id, name: c.name, phone: c.phone, address: c.address, khataEnabled: c.khataEnabled, creditLimit: c.creditLimitPaise, statementUrl: statementUrl(c.publicToken) },
    balance: khataBalance(ledger),
    daysOverdue: daysOverdue(ledger, now),
    ledger,
    consent: currentConsent(consentLog.map((r) => ({ purpose: r.purpose, granted: r.granted, createdAt: r.createdAt.getTime() }))),
    consentLog: consentLog.map((r) => ({ purpose: r.purpose, granted: r.granted, channel: r.channel, noticeVersion: r.noticeVersion, createdAt: r.createdAt.getTime() })),
    messages: messages.map((m) => ({ id: m.id, kind: m.kind, body: m.body, status: m.status, reason: m.reason, createdAt: m.createdAt.getTime() })),
  };
}

/** Add a customer at the counter. Consent ticks are the customer's verbal choice, logged as "counter". */
export async function addCustomer(
  ctx: Ctx,
  input: { phone: string; name: string; address?: string; khataEnabled: boolean; creditLimit: number; consentService: boolean; consentMarketing: boolean },
) {
  return ctx.db.transaction(async (tx) => {
    const c = await upsertCustomerByPhone(tx, ctx.orgId, input.phone, { name: input.name, address: input.address });
    await tx.update(schema.customers).set({ khataEnabled: input.khataEnabled, creditLimitPaise: input.creditLimit }).where(eq(schema.customers.id, c.id));
    const now = await consentOf(tx, ctx.orgId, c.id);
    if (input.consentService && !now.service) await recordConsent(tx, ctx.orgId, c.id, "service", true, "counter");
    if (input.consentMarketing && !now.marketing) await recordConsent(tx, ctx.orgId, c.id, "marketing", true, "counter");
    return { id: c.id };
  });
}

export async function updateCustomerKhata(ctx: Ctx, id: string, input: { khataEnabled: boolean; creditLimit: number }) {
  await loadCustomer(ctx, id);
  await ctx.db
    .update(schema.customers)
    .set({ khataEnabled: input.khataEnabled, creditLimitPaise: input.creditLimit })
    .where(and(eq(schema.customers.orgId, ctx.orgId), eq(schema.customers.id, id)));
  return { id };
}

/** Manual khata entry: credit given ("udhaar") or payment received. */
export async function addKhataEntry(ctx: Ctx, customerId: string, input: { kind: "credit" | "payment"; amount: number; method: "cash" | "upi"; note: string }) {
  const c = await loadCustomer(ctx, customerId);
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > 10_000_000) throw new StoreError("Enter an amount between ₹1 and ₹1,00,000");
  if (input.kind === "credit" && !c.khataEnabled) throw new StoreError("Turn on khata for this customer first", 409);
  const id = newId();
  await ctx.db.insert(schema.khataEntries).values({
    id,
    orgId: ctx.orgId,
    customerId,
    kind: input.kind,
    amountPaise: input.amount,
    method: input.method,
    note: input.note,
    createdBy: ctx.userId,
  });
  return { id };
}

/** Owner/staff records a consent change on the customer's behalf (e.g. they replied STOP). */
export async function setCustomerConsent(ctx: Ctx, customerId: string, purpose: ConsentPurpose | "stop", granted: boolean) {
  await loadCustomer(ctx, customerId);
  if (purpose === "stop") await withdrawAll(ctx.db, ctx.orgId, customerId, "whatsapp");
  else await recordConsent(ctx.db, ctx.orgId, customerId, purpose, granted, "counter");
  return consentOf(ctx.db, ctx.orgId, customerId);
}

/** Send a khata payment reminder (utility message with statement + UPI link). */
export async function sendReminder(ctx: Ctx, customerId: string) {
  const c = await loadCustomer(ctx, customerId);
  const org = await loadOrg(ctx.db, ctx.orgId);
  const entries = await ctx.db.select().from(schema.khataEntries).where(and(eq(schema.khataEntries.orgId, ctx.orgId), eq(schema.khataEntries.customerId, c.id)));
  const balance = khataBalance(entries.map((e) => ({ kind: e.kind, amount: e.amountPaise, createdAt: 0 })));
  if (balance <= 0) throw new StoreError("Nothing is due from this customer", 409);
  const sent = await sendToCustomer(ctx.db, {
    orgId: ctx.orgId,
    customer: c,
    kind: "khata_reminder",
    body: khataReminderText({ store: org.name, name: c.name, balance, payUrl: statementUrl(c.publicToken) }),
  });
  return { sent, reason: sent ? undefined : "Customer has not agreed to service messages" };
}

/** Remind every customer with a balance. Customers without service consent are skipped and logged. */
export async function sendAllReminders(ctx: Ctx) {
  const list = await listCustomers(ctx);
  let sent = 0;
  let skipped = 0;
  for (const c of list.filter((x) => x.balance > 0)) {
    const r = await sendReminder(ctx, c.id);
    if (r.sent) sent++;
    else skipped++;
  }
  return { sent, skipped };
}
