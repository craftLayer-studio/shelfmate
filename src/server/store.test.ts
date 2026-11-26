import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { upcomingSlots } from "@/domain";
import { openDb, schema, type Db } from "./db";
import { DEMO_OWNER_PHONE, DEMO_QR_TOKEN, DEMO_STAFF_PHONE, seedDemo } from "./db/seed";
import * as store from "./store";
import type { Ctx } from "./store";

let db: Db;
let owner: Ctx;
let staff: Ctx;
const NOW = Date.parse("2026-11-25T05:00:00Z"); // 10:30 am IST

async function login(phone: string): Promise<Ctx> {
  const { code } = await store.requestOtp(db, phone, NOW);
  const s = await store.verifyOtp(db, phone, code!, NOW);
  return { db, orgId: s.orgId, userId: s.userId, role: s.role };
}

beforeAll(async () => {
  db = await openDb({ memory: true });
  await seedDemo(db, NOW);
  owner = await login(DEMO_OWNER_PHONE);
  staff = await login(DEMO_STAFF_PHONE);
}, 60_000);

async function productId(name: string) {
  const [p] = await db.select().from(schema.products).where(eq(schema.products.name, name));
  return p;
}

describe("auth", () => {
  it("signs in with OTP, rejects wrong and reused codes", async () => {
    expect(owner.role).toBe("owner");
    expect(staff.role).toBe("staff");
    const { code } = await store.requestOtp(db, DEMO_OWNER_PHONE, NOW);
    await expect(store.verifyOtp(db, DEMO_OWNER_PHONE, code === "000000" ? "111111" : "000000", NOW)).rejects.toThrow(/Wrong/);
    await store.verifyOtp(db, DEMO_OWNER_PHONE, code!, NOW);
    await expect(store.verifyOtp(db, DEMO_OWNER_PHONE, code!, NOW)).rejects.toThrow(/expired/);
  });

  it("does not reveal unknown numbers and expires codes", async () => {
    expect((await store.requestOtp(db, "+919999999999", NOW)).code).toBeNull();
    const { code } = await store.requestOtp(db, DEMO_STAFF_PHONE, NOW);
    await expect(store.verifyOtp(db, DEMO_STAFF_PHONE, code!, NOW + 6 * 60_000)).rejects.toThrow(/expired/);
  });
});

describe("QR order to delivery", () => {
  it("places an order, captures consent, runs the queue and invoices on delivery", async () => {
    const front = await store.getStorefront(db, DEMO_QR_TOKEN, NOW);
    expect(front.store.isDemo).toBe(true);
    expect(front.products.some((p) => p.name.startsWith("Amoxicillin"))).toBe(false);
    const atta = await productId("Chakki Atta 5 kg");
    const sugar = await productId("Sugar (loose)");
    const slot = front.slots[0];
    const res = await store.placeOrder(
      db,
      DEMO_QR_TOKEN,
      {
        name: "Kavita Rao",
        phone: "+919000030001",
        address: "Flat 3, Sahyadri Heights, Kothrud",
        fulfilment: "delivery",
        slotStart: slot.start,
        paymentMode: "upi",
        note: "",
        lines: [
          { productId: atta.id, qtyMilli: 1000 },
          { productId: sugar.id, qtyMilli: 1500 },
        ],
        consentService: true,
        consentMarketing: false,
      },
      NOW,
    );
    expect(res.total).toBe(26500 + 6900);
    expect(res.whatsappLink).toMatch(/^https:\/\/wa\.me\/919000010001\?text=/);
    expect((await productId("Chakki Atta 5 kg")).stockMilli).toBe(atta.stockMilli - 1000);

    const pub = await store.getOrderPublic(db, res.token);
    expect(pub.order.status).toBe("placed");
    expect(pub.upiLink).toContain("am=334.00");

    const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.phone, "+919000030001"));
    const detail = await store.getCustomer(owner, customer.id, NOW);
    expect(detail.consent).toEqual({ service: true, marketing: false });
    expect(detail.consentLog[0].noticeVersion).toBeTruthy();

    const queue = await store.listOrders(staff, { since: NOW - 86_400_000 });
    const mine = queue.find((o) => o.number === res.number)!;
    expect(mine.items).toHaveLength(2);

    await expect(store.transitionOrder(staff, mine.id, "delivered", NOW)).rejects.toThrow(/Cannot move/);
    for (const s of ["accepted", "packed", "out_for_delivery", "delivered"] as const) await store.transitionOrder(staff, mine.id, s, NOW);
    const after = await store.getOrderPublic(db, res.token);
    expect(after.order.status).toBe("delivered");
    expect(after.events.map((e) => e.status)).toEqual(["placed", "accepted", "packed", "out_for_delivery", "delivered"]);

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.publicToken, res.token));
    const inv = await store.getInvoice(owner, order.invoiceId!);
    expect(inv.invoice.totalPaise).toBe(res.total);
    expect(inv.invoice.taxablePaise + inv.invoice.cgstPaise + inv.invoice.sgstPaise).toBe(res.total);

    const msgs = await db.select().from(schema.outbox).where(eq(schema.outbox.customerId, customer.id));
    expect(msgs.filter((m) => m.status === "sent")).toHaveLength(5);
  });

  it("rejects bad slots, scheduled drugs and khata without permission", async () => {
    const front = await store.getStorefront(db, DEMO_QR_TOKEN, NOW);
    const atta = await productId("Chakki Atta 5 kg");
    const amox = await productId("Amoxicillin 500 mg (strip of 10)");
    const base = {
      name: "Test",
      phone: "+919000030002",
      address: "Somewhere in Kothrud",
      fulfilment: "pickup" as const,
      slotStart: front.slots[0].start,
      paymentMode: "cod" as const,
      note: "",
      lines: [{ productId: atta.id, qtyMilli: 1000 }],
      consentService: false,
      consentMarketing: false,
    };
    await expect(store.placeOrder(db, DEMO_QR_TOKEN, { ...base, slotStart: NOW - 1000 }, NOW)).rejects.toThrow(/slot/);
    await expect(store.placeOrder(db, DEMO_QR_TOKEN, { ...base, lines: [{ productId: amox.id, qtyMilli: 1000 }] }, NOW)).rejects.toThrow(/prescription/);
    await expect(store.placeOrder(db, DEMO_QR_TOKEN, { ...base, paymentMode: "khata" }, NOW)).rejects.toThrow(/Khata/);
    await expect(store.placeOrder(db, "nope", base, NOW)).rejects.toThrow(/not linked/);
    // Without service consent, the confirmation is logged as skipped, not sent.
    await store.placeOrder(db, DEMO_QR_TOKEN, base, NOW);
    const [c] = await db.select().from(schema.customers).where(eq(schema.customers.phone, "+919000030002"));
    const msgs = await db.select().from(schema.outbox).where(eq(schema.outbox.customerId, c.id));
    expect(msgs.map((m) => m.status)).toEqual(["skipped"]);
  });

  it("restores stock on cancel", async () => {
    const queue = await store.listOrders(staff, { since: NOW });
    const placed = queue.find((o) => o.status === "placed")!;
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, placed.id));
    const before = (await db.select().from(schema.products).where(eq(schema.products.id, items[0].productId)))[0].stockMilli;
    await store.transitionOrder(staff, placed.id, "cancelled", NOW);
    const after = (await db.select().from(schema.products).where(eq(schema.products.id, items[0].productId)))[0].stockMilli;
    expect(after).toBe(before + items[0].qtyMilli);
  });
});

describe("billing and khata", () => {
  it("bills on khata, then reminder and simulated UPI payment reduce the balance", async () => {
    const soap = await productId("Bath Soap 4 x 100 g");
    const [sunita] = await db.select().from(schema.customers).where(eq(schema.customers.phone, "+919000020001"));
    const before = (await store.getCustomer(staff, sunita.id, NOW)).balance;
    const bill = await store.createBill(staff, { lines: [{ productId: soap.id, qtyMilli: 1000 }], paymentMode: "khata", customerPhone: sunita.phone }, NOW);
    expect(bill.number).toMatch(/^SM\/26-27\/\d{4}$/);
    const inv = await store.getInvoice(staff, bill.id);
    expect(inv.items[0].hsn).toBe("3401");
    expect(inv.invoice.cgstPaise).toBe(inv.invoice.sgstPaise);
    const mid = (await store.getCustomer(staff, sunita.id, NOW)).balance;
    expect(mid).toBe(before + 17000);

    const r = await store.sendReminder(staff, sunita.id);
    expect(r.sent).toBe(true);
    const statement = await store.getStatement(db, sunita.publicToken);
    expect(statement.balance).toBe(mid);
    expect(statement.upiLink).toContain("upi://pay");
    const paid = await store.payStatement(db, sunita.publicToken, 10000);
    expect(paid.balance).toBe(mid - 10000);
    await expect(store.payStatement(db, sunita.publicToken, mid * 10)).rejects.toThrow();
  });

  it("enforces khata switch and credit limit on counter bills", async () => {
    const ghee = await productId("Cow Ghee 500 ml");
    await expect(store.createBill(staff, { lines: [{ productId: ghee.id, qtyMilli: 1000 }], paymentMode: "khata", customerPhone: "+919000020005" }, NOW)).rejects.toThrow(/not enabled/);
    await expect(store.createBill(staff, { lines: [{ productId: ghee.id, qtyMilli: 1000 }], paymentMode: "khata" }, NOW)).rejects.toThrow(/customer/);
    const walkIn = await store.createBill(staff, { lines: [{ productId: ghee.id, qtyMilli: 1000 }], paymentMode: "cash" }, NOW);
    expect(walkIn.total).toBe(32000);
  });

  it("skips reminders without consent and honours STOP", async () => {
    const [vikram] = await db.select().from(schema.customers).where(eq(schema.customers.phone, "+919000020006"));
    await store.addKhataEntry(staff, vikram.id, { kind: "credit", amount: 5000, method: "cash", note: "Milk" });
    expect((await store.sendReminder(staff, vikram.id)).sent).toBe(false);
    const [aisha] = await db.select().from(schema.customers).where(eq(schema.customers.phone, "+919000020003"));
    const c = await store.stopAllPublic(db, aisha.publicToken);
    expect(c).toEqual({ service: false, marketing: false });
  });
});

describe("owner", () => {
  it("restricts owner screens to the owner", async () => {
    await expect(store.getDashboard(staff, NOW)).rejects.toThrow(/owner/);
    await expect(store.getSettings(staff)).rejects.toThrow(/owner/);
  });

  it("sends offers only to marketing opt-ins and shows results on the dashboard", async () => {
    const r = await store.sendCampaign(owner, { message: "Fresh atta arrived, 5% off this week.", segment: "all" }, NOW);
    const optedIn = (await store.listCustomers(owner, NOW)).filter((c) => c.consent.marketing).length;
    expect(r.sent).toBe(optedIn);
    expect(r.skipped).toBeGreaterThan(0);
    const d = await store.getDashboard(owner, NOW);
    expect(d.salesToday).toBeGreaterThan(0);
    expect(d.creditOutstanding).toBeGreaterThan(0);
    expect(d.topItems.length).toBeGreaterThan(0);
    expect(d.repeatCustomers).toBeGreaterThan(0);
    expect(d.campaigns[0].sent).toBe(r.sent);
  });

  it("produces a QR sheet with an unguessable token and inventory alerts", async () => {
    const qr = await store.getQrSheet(owner);
    expect(qr.svg).toContain("<svg");
    expect(qr.url).toContain(`/s/${DEMO_QR_TOKEN}`);
    const inv = await store.getInventory(staff, NOW);
    expect(inv.lowStock.some((p) => p.name.startsWith("Toor Dal"))).toBe(true);
    expect(inv.expiring.some((b) => b.state === "expired")).toBe(true);
    expect(inv.reorderLink).toMatch(/^https:\/\/wa\.me\//);
  });

  it("keeps tenants apart", async () => {
    const otherOrg = await db.insert(schema.orgs).values({ id: "other", name: "Other", ownerPhone: "+919000090001", whatsappPhone: "+919000090001", upiVpa: "x@upi", qrToken: "other-token" }).returning();
    const other: Ctx = { db, orgId: otherOrg[0].id, userId: "u", role: "owner" };
    const [sunita] = await db.select().from(schema.customers).where(and(eq(schema.customers.orgId, owner.orgId), eq(schema.customers.phone, "+919000020001")));
    await expect(store.getCustomer(other, sunita.id)).rejects.toThrow(/not found/);
    expect(await store.listOrders(other)).toEqual([]);
  });

  it("validates settings", async () => {
    const s = await store.getSettings(owner);
    const base = {
      name: s.org.name, address: s.org.address, city: s.org.city, whatsappPhone: s.org.whatsappPhone, upiVpa: s.org.upiVpa, gstin: s.org.gstin,
      composition: false, deliveryRadiusKm: 2, minOrder: 0, openMinute: 420, closeMinute: 1320, slotMinutes: 60,
    };
    await expect(store.updateSettings(owner, { ...base, upiVpa: "bad" })).rejects.toThrow(/UPI/);
    await store.updateSettings(owner, base);
    expect(upcomingSlots(NOW, { openMinute: 420, closeMinute: 1320, slotMinutes: 60 }).length).toBeGreaterThan(0);
  });
});
