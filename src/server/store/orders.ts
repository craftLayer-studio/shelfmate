import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { canTransition, formatQty, isOpen, orderStatusText, statusLabel, type OrderStatus } from "@/domain";
import { schema } from "../db";
import { StoreError, newId, type Ctx } from "./core";
import { createInvoiceTx } from "./billing";
import { loadOrg, moveStock, sendToCustomer } from "./shared";
import { trackUrl } from "./public";

/** Staff order queue: open orders plus today's closed ones, newest first. */
export async function listOrders(ctx: Ctx, opts: { since?: number } = {}) {
  const since = new Date(opts.since ?? Date.now() - 86_400_000);
  const rows = await ctx.db
    .select({ order: schema.orders, customer: schema.customers })
    .from(schema.orders)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.orders.customerId))
    .where(
      and(
        eq(schema.orders.orgId, ctx.orgId),
        or(inArray(schema.orders.status, ["placed", "accepted", "packed", "out_for_delivery"]), gte(schema.orders.updatedAt, since)),
      ),
    )
    .orderBy(desc(schema.orders.createdAt))
    .limit(100);
  const ids = rows.map((r) => r.order.id);
  const items = ids.length
    ? await ctx.db.select().from(schema.orderItems).where(and(eq(schema.orderItems.orgId, ctx.orgId), inArray(schema.orderItems.orderId, ids)))
    : [];
  return rows.map(({ order, customer }) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: statusLabel(order.status, order.fulfilment),
    open: isOpen(order.status),
    fulfilment: order.fulfilment,
    slotStart: order.slotStart.getTime(),
    slotEnd: order.slotEnd.getTime(),
    address: order.address,
    note: order.note,
    paymentMode: order.paymentMode,
    paid: order.paid,
    total: order.totalPaise,
    invoiceId: order.invoiceId,
    createdAt: order.createdAt.getTime(),
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    items: items
      .filter((i) => i.orderId === order.id)
      .map((i) => ({ name: i.name, qty: formatQty(i.qtyMilli, i.unit), amount: i.amountPaise })),
  }));
}

/**
 * Move an order to its next status. Side effects: customer update message (with consent),
 * stock restored on cancel, and on delivery a GST invoice plus a khata credit for khata orders.
 */
export async function transitionOrder(ctx: Ctx, orderId: string, to: OrderStatus, now = Date.now()) {
  return ctx.db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(and(eq(schema.orders.orgId, ctx.orgId), eq(schema.orders.id, orderId)));
    if (!order) throw new StoreError("Order not found", 404);
    if (!canTransition(order.status, to, order.fulfilment)) {
      throw new StoreError(`Cannot move an order from "${statusLabel(order.status, order.fulfilment)}" to "${statusLabel(to, order.fulfilment)}"`, 409);
    }
    const org = await loadOrg(tx, ctx.orgId);
    const items = await tx.select().from(schema.orderItems).where(and(eq(schema.orderItems.orgId, ctx.orgId), eq(schema.orderItems.orderId, order.id)));
    const patch: Partial<typeof schema.orders.$inferInsert> = { status: to, updatedAt: new Date(now) };

    if (to === "cancelled") await moveStock(tx, ctx.orgId, items.map((i) => ({ productId: i.productId, qtyMilli: i.qtyMilli })), 1);

    if (to === "delivered") {
      const [customer] = await tx.select().from(schema.customers).where(eq(schema.customers.id, order.customerId));
      const invoice = await createInvoiceTx(tx, ctx, {
        lines: items.map((i) => ({ productId: i.productId, name: i.name, unit: i.unit, hsn: i.hsn, qtyMilli: i.qtyMilli, unitPrice: i.unitPricePaise, gstRateBp: i.gstRateBp })),
        customer,
        paymentMode: order.paymentMode === "khata" ? "khata" : order.paymentMode === "upi" ? "upi" : "cash",
        orderId: order.id,
        now,
        skipStock: true,
        skipCreditCheck: true,
      });
      patch.invoiceId = invoice.id;
      if (order.paymentMode === "cod") patch.paid = true;
    }

    await tx.update(schema.orders).set(patch).where(eq(schema.orders.id, order.id));
    await tx.insert(schema.orderEvents).values({ id: newId(), orgId: ctx.orgId, orderId: order.id, status: to, byUserId: ctx.userId, createdAt: new Date(now) });
    const [customer] = await tx.select().from(schema.customers).where(eq(schema.customers.id, order.customerId));
    await sendToCustomer(tx, {
      orgId: ctx.orgId,
      customer,
      kind: "order_update",
      body: orderStatusText({ store: org.name, number: order.number, statusLabel: statusLabel(to, order.fulfilment), trackUrl: trackUrl(order.publicToken) }),
    });
    return { id: order.id, status: to };
  });
}

/** Staff confirms a UPI payment arrived (checked in their UPI app). */
export async function markOrderPaid(ctx: Ctx, orderId: string) {
  const [order] = await ctx.db.select().from(schema.orders).where(and(eq(schema.orders.orgId, ctx.orgId), eq(schema.orders.id, orderId)));
  if (!order) throw new StoreError("Order not found", 404);
  if (order.paymentMode === "khata") throw new StoreError("Khata orders are settled through the khata", 409);
  await ctx.db.update(schema.orders).set({ paid: true, updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
  return { id: order.id, paid: true };
}
