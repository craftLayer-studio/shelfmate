import { and, eq } from "drizzle-orm";
import { expiryAlerts, formatQty, istDate, isValidHsn, isValidQty, lowStock, reorderText, waMeLink, type DrugSchedule, type Unit } from "@/domain";
import { schema } from "../db";
import { StoreError, newId, requireOwner, type Ctx } from "./core";
import { loadOrg, loadProducts } from "./shared";

export async function getInventory(ctx: Ctx, now = Date.now()) {
  const [products, batches, org] = await Promise.all([
    loadProducts(ctx.db, ctx.orgId),
    ctx.db.select().from(schema.batches).where(eq(schema.batches.orgId, ctx.orgId)),
    loadOrg(ctx.db, ctx.orgId),
  ]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const low = lowStock(products.map((p) => ({ ...p, stockMilli: p.stockMilli, minStockMilli: p.minStockMilli })));
  const expiring = expiryAlerts(
    batches.map((b) => ({ id: b.id, productId: b.productId, productName: names.get(b.productId) ?? "", batchNo: b.batchNo, expiry: b.expiry, qtyMilli: b.qtyMilli })),
    istDate(now),
    30,
  );
  const reorder = low.map((p) => ({ name: p.name, qty: formatQty(Math.max(p.minStockMilli * 2 - p.stockMilli, 1000), p.unit) }));
  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      price: p.pricePaise,
      mrp: p.mrpPaise,
      hsn: p.hsn,
      gstRateBp: p.gstRateBp,
      schedule: p.schedule,
      trackStock: p.trackStock,
      stockMilli: p.stockMilli,
      minStockMilli: p.minStockMilli,
      active: p.active,
    })),
    lowStock: low.map((p) => ({ id: p.id, name: p.name, stock: formatQty(p.stockMilli, p.unit), min: formatQty(p.minStockMilli, p.unit) })),
    expiring: expiring.map((b) => ({ ...b, qty: formatQty(b.qtyMilli, products.find((p) => p.id === b.productId)?.unit ?? "pc") })),
    reorderLink: reorder.length ? waMeLink(org.whatsappPhone, reorderText(org.name, reorder)) : null,
  };
}

/** Receive stock (positive) or write off (negative). Staff can do this. */
export async function adjustStock(ctx: Ctx, productId: string, deltaMilli: number) {
  const [p] = await ctx.db.select().from(schema.products).where(and(eq(schema.products.orgId, ctx.orgId), eq(schema.products.id, productId)));
  if (!p) throw new StoreError("Product not found", 404);
  if (!Number.isInteger(deltaMilli) || deltaMilli === 0 || !isValidQty(p.unit, Math.abs(deltaMilli))) throw new StoreError("Enter a valid quantity");
  const stockMilli = Math.max(0, p.stockMilli + deltaMilli);
  await ctx.db.update(schema.products).set({ stockMilli }).where(eq(schema.products.id, p.id));
  return { id: p.id, stockMilli };
}

export interface ProductInput {
  name: string;
  brand: string;
  category: string;
  unit: Unit;
  price: number;
  mrp: number;
  hsn: string;
  gstRateBp: number;
  schedule: DrugSchedule;
  trackStock: boolean;
  stockMilli: number;
  minStockMilli: number;
  active: boolean;
}

function checkProduct(p: ProductInput): void {
  if (!isValidHsn(p.hsn)) throw new StoreError("HSN must be 4, 6 or 8 digits");
  if (p.price <= 0 || p.mrp < p.price) throw new StoreError("Price must be above zero and not more than MRP");
  if (p.stockMilli < 0 || p.minStockMilli < 0) throw new StoreError("Stock cannot be negative");
}

/** Prices and catalog are owner-only. */
export async function saveProduct(ctx: Ctx, id: string | null, input: ProductInput) {
  requireOwner(ctx);
  checkProduct(input);
  const values = {
    name: input.name,
    brand: input.brand,
    category: input.category,
    unit: input.unit,
    pricePaise: input.price,
    mrpPaise: input.mrp,
    hsn: input.hsn,
    gstRateBp: input.gstRateBp,
    schedule: input.schedule,
    trackStock: input.trackStock,
    stockMilli: input.stockMilli,
    minStockMilli: input.minStockMilli,
    active: input.active,
  };
  if (id) {
    const res = await ctx.db.update(schema.products).set(values).where(and(eq(schema.products.orgId, ctx.orgId), eq(schema.products.id, id))).returning();
    if (!res.length) throw new StoreError("Product not found", 404);
    return { id };
  }
  const newProductId = newId();
  await ctx.db.insert(schema.products).values({ id: newProductId, orgId: ctx.orgId, ...values });
  return { id: newProductId };
}

export async function addBatch(ctx: Ctx, productId: string, input: { batchNo: string; expiry: string; qtyMilli: number }) {
  const [p] = await ctx.db.select().from(schema.products).where(and(eq(schema.products.orgId, ctx.orgId), eq(schema.products.id, productId)));
  if (!p) throw new StoreError("Product not found", 404);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiry) || Number.isNaN(Date.parse(input.expiry))) throw new StoreError("Expiry must be a date");
  if (!isValidQty(p.unit, input.qtyMilli)) throw new StoreError("Enter a valid quantity");
  const id = newId();
  await ctx.db.insert(schema.batches).values({ id, orgId: ctx.orgId, productId, batchNo: input.batchNo, expiry: input.expiry, qtyMilli: input.qtyMilli });
  if (p.trackStock) await ctx.db.update(schema.products).set({ stockMilli: p.stockMilli + input.qtyMilli }).where(eq(schema.products.id, p.id));
  return { id };
}

/** Clear a batch (sold through, returned to distributor, or written off). */
export async function clearBatch(ctx: Ctx, batchId: string) {
  const res = await ctx.db.update(schema.batches).set({ qtyMilli: 0 }).where(and(eq(schema.batches.orgId, ctx.orgId), eq(schema.batches.id, batchId))).returning();
  if (!res.length) throw new StoreError("Batch not found", 404);
  return { id: batchId };
}
