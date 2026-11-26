import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey();
const orgId = () => text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** One store (tenant). */
export const orgs = pgTable("orgs", {
  id: id(),
  name: text("name").notNull(),
  storeType: text("store_type").notNull().default("kirana"),
  ownerPhone: text("owner_phone").notNull(),
  whatsappPhone: text("whatsapp_phone").notNull(),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  gstin: text("gstin"),
  composition: boolean("composition").notNull().default(false),
  upiVpa: text("upi_vpa").notNull(),
  deliveryRadiusKm: integer("delivery_radius_km").notNull().default(2),
  minOrderPaise: integer("min_order_paise").notNull().default(0),
  openMinute: integer("open_minute").notNull().default(480),
  closeMinute: integer("close_minute").notNull().default(1260),
  slotMinutes: integer("slot_minutes").notNull().default(120),
  /** Random, unguessable token printed in the store QR. */
  qrToken: text("qr_token").notNull().unique(),
  invoiceSeq: integer("invoice_seq").notNull().default(0),
  orderSeq: integer("order_seq").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const staffUsers = pgTable(
  "staff_users",
  {
    id: id(),
    orgId: orgId(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["owner", "staff"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("staff_org_phone").on(t.orgId, t.phone), index("staff_phone").on(t.phone)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_phone").on(t.phone)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    orgId: orgId(),
    name: text("name").notNull(),
    brand: text("brand").notNull().default(""),
    category: text("category").notNull(),
    unit: text("unit", { enum: ["pc", "pack", "kg", "l"] }).notNull(),
    pricePaise: integer("price_paise").notNull(),
    mrpPaise: integer("mrp_paise").notNull(),
    hsn: text("hsn").notNull(),
    gstRateBp: integer("gst_rate_bp").notNull(),
    schedule: text("schedule", { enum: ["none", "H", "H1", "X"] }).notNull().default("none"),
    trackStock: boolean("track_stock").notNull().default(true),
    stockMilli: integer("stock_milli").notNull().default(0),
    minStockMilli: integer("min_stock_milli").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("products_org").on(t.orgId)],
);

export const batches = pgTable(
  "batches",
  {
    id: id(),
    orgId: orgId(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    batchNo: text("batch_no").notNull(),
    expiry: date("expiry", { mode: "string" }).notNull(),
    qtyMilli: integer("qty_milli").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("batches_org").on(t.orgId)],
);

export const customers = pgTable(
  "customers",
  {
    id: id(),
    orgId: orgId(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    khataEnabled: boolean("khata_enabled").notNull().default(false),
    creditLimitPaise: integer("credit_limit_paise").notNull().default(0),
    /** Random token for the customer's khata statement / preferences link. */
    publicToken: text("public_token").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("customers_org_phone").on(t.orgId, t.phone)],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    orgId: orgId(),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: ["service", "marketing"] }).notNull(),
    granted: boolean("granted").notNull(),
    noticeVersion: text("notice_version").notNull(),
    channel: text("channel", { enum: ["qr", "counter", "statement", "whatsapp"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("consent_customer").on(t.orgId, t.customerId)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orgId: orgId(),
    number: integer("number").notNull(),
    customerId: text("customer_id").notNull().references(() => customers.id),
    publicToken: text("public_token").notNull().unique(),
    fulfilment: text("fulfilment", { enum: ["delivery", "pickup"] }).notNull(),
    slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
    slotEnd: timestamp("slot_end", { withTimezone: true }).notNull(),
    address: text("address").notNull().default(""),
    note: text("note").notNull().default(""),
    paymentMode: text("payment_mode", { enum: ["cod", "upi", "khata"] }).notNull(),
    paid: boolean("paid").notNull().default(false),
    status: text("status", { enum: ["placed", "accepted", "packed", "out_for_delivery", "delivered", "cancelled"] }).notNull(),
    totalPaise: integer("total_paise").notNull(),
    invoiceId: text("invoice_id"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_org_number").on(t.orgId, t.number), index("orders_org_status").on(t.orgId, t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orgId: orgId(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    unit: text("unit", { enum: ["pc", "pack", "kg", "l"] }).notNull(),
    qtyMilli: integer("qty_milli").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    hsn: text("hsn").notNull(),
    gstRateBp: integer("gst_rate_bp").notNull(),
  },
  (t) => [index("order_items_order").on(t.orgId, t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orgId: orgId(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    byUserId: text("by_user_id"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order").on(t.orgId, t.orderId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    orgId: orgId(),
    number: text("number").notNull(),
    kind: text("kind", { enum: ["tax_invoice", "bill_of_supply"] }).notNull(),
    customerId: text("customer_id").references(() => customers.id),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    orderId: text("order_id"),
    paymentMode: text("payment_mode", { enum: ["cash", "upi", "khata"] }).notNull(),
    taxablePaise: integer("taxable_paise").notNull(),
    cgstPaise: integer("cgst_paise").notNull(),
    sgstPaise: integer("sgst_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invoices_org_number").on(t.orgId, t.number), index("invoices_org_created").on(t.orgId, t.createdAt)],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: id(),
    orgId: orgId(),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    hsn: text("hsn").notNull(),
    unit: text("unit", { enum: ["pc", "pack", "kg", "l"] }).notNull(),
    qtyMilli: integer("qty_milli").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    gstRateBp: integer("gst_rate_bp").notNull(),
    taxablePaise: integer("taxable_paise").notNull(),
    cgstPaise: integer("cgst_paise").notNull(),
    sgstPaise: integer("sgst_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
  },
  (t) => [index("invoice_items_invoice").on(t.orgId, t.invoiceId)],
);

export const khataEntries = pgTable(
  "khata_entries",
  {
    id: id(),
    orgId: orgId(),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["credit", "payment"] }).notNull(),
    amountPaise: integer("amount_paise").notNull(),
    method: text("method", { enum: ["cash", "upi", "order", "bill"] }).notNull(),
    orderId: text("order_id"),
    invoiceId: text("invoice_id"),
    note: text("note").notNull().default(""),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("khata_org_customer").on(t.orgId, t.customerId)],
);

export const campaigns = pgTable("campaigns", {
  id: id(),
  orgId: orgId(),
  message: text("message").notNull(),
  segment: text("segment", { enum: ["all", "inactive_21d"] }).notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  createdAt: createdAt(),
});

/** Every outgoing message. The simulated adapter writes here; the UI shows it as the WhatsApp outbox. */
export const outbox = pgTable(
  "outbox",
  {
    id: id(),
    orgId: orgId(),
    channel: text("channel", { enum: ["whatsapp", "sms"] }).notNull(),
    toPhone: text("to_phone").notNull(),
    customerId: text("customer_id"),
    kind: text("kind", { enum: ["order_update", "khata_reminder", "offer", "otp"] }).notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["sent", "skipped"] }).notNull(),
    reason: text("reason"),
    campaignId: text("campaign_id"),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_org_created").on(t.orgId, t.createdAt)],
);

