import { count, eq } from "drizzle-orm";
import { NOTICE_VERSION, computeInvoice, invoiceNumber, lineAmount, startOfDayIST, type Unit } from "@/domain";
import { newId, newToken } from "../store/core";
import * as schema from "./schema";
import type { Db } from "./client";

/** Fixed token so the demo QR link stays the same across reseeds. */
export const DEMO_QR_TOKEN = "demo-annapurna-7Qx2";
export const DEMO_OWNER_PHONE = "+919000010001";
export const DEMO_STAFF_PHONE = "+919000010002";
const DAY = 86_400_000;

type P = [name: string, brand: string, category: string, unit: Unit, pricePaise: number, mrpPaise: number, hsn: string, gstBp: number, stock: number, min: number, schedule?: "none" | "H"];

const PRODUCTS: P[] = [
  ["Chakki Atta 5 kg", "Golden Harvest", "Atta, rice & dal", "pack", 26500, 28000, "1101", 0, 14, 6],
  ["Basmati Rice 1 kg", "Daawat", "Atta, rice & dal", "pack", 13900, 15500, "1006", 500, 20, 8],
  ["Sona Masoori Rice (loose)", "", "Atta, rice & dal", "kg", 6200, 6500, "1006", 0, 40, 15],
  ["Toor Dal (loose)", "", "Atta, rice & dal", "kg", 16000, 17000, "0713", 0, 3, 10],
  ["Moong Dal 1 kg", "Tata Sampann", "Atta, rice & dal", "pack", 15800, 16500, "0713", 500, 9, 5],
  ["Sugar (loose)", "", "Atta, rice & dal", "kg", 4600, 4800, "1701", 500, 50, 20],
  ["Sunflower Oil 1 l", "Fortune", "Oil & ghee", "pack", 15500, 17500, "1512", 500, 18, 8],
  ["Mustard Oil 1 l", "Patanjali", "Oil & ghee", "pack", 17000, 18500, "1514", 500, 2, 6],
  ["Cow Ghee 500 ml", "Amul", "Oil & ghee", "pack", 32000, 33000, "0405", 500, 7, 4],
  ["Full Cream Milk 500 ml", "Amul", "Dairy & bakery", "pack", 3400, 3400, "0401", 0, 30, 20],
  ["Curd 400 g", "Chitale", "Dairy & bakery", "pack", 4500, 4500, "0403", 500, 12, 6],
  ["Paneer 200 g", "Gowardhan", "Dairy & bakery", "pack", 9000, 9500, "0406", 500, 6, 4],
  ["Brown Bread", "Britannia", "Dairy & bakery", "pack", 5000, 5000, "1905", 0, 8, 6],
  ["Eggs (tray of 6)", "", "Dairy & bakery", "pack", 4800, 4800, "0407", 0, 15, 6],
  ["Parle-G 250 g", "Parle", "Snacks & biscuits", "pack", 2500, 2500, "1905", 500, 40, 15],
  ["Good Day Cashew 200 g", "Britannia", "Snacks & biscuits", "pack", 4000, 4000, "1905", 500, 22, 10],
  ["Bhujia Sev 400 g", "Haldiram's", "Snacks & biscuits", "pack", 11000, 11500, "2106", 500, 10, 5],
  ["Maggi Masala 4-pack", "Nestle", "Snacks & biscuits", "pack", 5600, 5600, "1902", 500, 25, 10],
  ["Tea 500 g", "Tata Tea Gold", "Tea, coffee & drinks", "pack", 28000, 30000, "0902", 500, 11, 5],
  ["Instant Coffee 50 g", "Bru", "Tea, coffee & drinks", "pack", 17500, 18500, "2101", 500, 6, 4],
  ["Cola 750 ml", "Thums Up", "Tea, coffee & drinks", "pack", 4000, 4000, "2202", 4000, 24, 12],
  ["Turmeric Powder 200 g", "Everest", "Masala", "pack", 6200, 6500, "0910", 500, 13, 6],
  ["Garam Masala 100 g", "MDH", "Masala", "pack", 8800, 9200, "0910", 500, 9, 5],
  ["Iodised Salt 1 kg", "Tata", "Masala", "pack", 2800, 2800, "2501", 0, 30, 10],
  ["Bath Soap 4 x 100 g", "Lifebuoy", "Personal care", "pack", 17000, 18400, "3401", 500, 16, 6],
  ["Toothpaste 150 g", "Colgate", "Personal care", "pack", 10500, 11500, "3306", 500, 14, 6],
  ["Coconut Hair Oil 300 ml", "Parachute", "Personal care", "pack", 14500, 15200, "1513", 500, 1, 5],
  ["Detergent Powder 1 kg", "Surf Excel", "Home care", "pack", 13500, 14500, "3402", 1800, 12, 6],
  ["Dishwash Bar 3-pack", "Vim", "Home care", "pack", 6000, 6000, "3402", 1800, 18, 8],
  ["Floor Cleaner 1 l", "Lizol", "Home care", "pack", 21500, 23200, "3808", 1800, 7, 4],
  ["Paracetamol 500 mg (strip of 15)", "Dolo", "Health (OTC)", "pack", 3300, 3300, "3004", 500, 30, 10],
  ["ORS Sachet", "Electral", "Health (OTC)", "pc", 2300, 2300, "3004", 500, 25, 10],
  ["Antiseptic Liquid 250 ml", "Dettol", "Health (OTC)", "pack", 13500, 14300, "3808", 1800, 9, 4],
  ["Amoxicillin 500 mg (strip of 10)", "Generic", "Health (Rx, counter only)", "pack", 9500, 10500, "3004", 500, 12, 5, "H"],
];

const CUSTOMERS: [name: string, phone: string, address: string, khata: boolean, limitRupees: number, service: boolean, marketing: boolean][] = [
  ["Sunita Deshpande", "+919000020001", "B-204, Shivneri Apartments, Karve Nagar", true, 5000, true, true],
  ["Rahul Kulkarni", "+919000020002", "Flat 12, Gulmohar Society, Kothrud", true, 3000, true, false],
  ["Aisha Shaikh", "+919000020003", "A-9, Mayur Colony, Kothrud", true, 4000, true, true],
  ["Prakash Joshi", "+919000020004", "Row House 7, Ideal Colony", true, 2000, true, false],
  ["Meera Iyer", "+919000020005", "C-501, Sukhwani Park, Kothrud", false, 0, true, true],
  ["Vikram Patil", "+919000020006", "17, Bhusari Colony", true, 6000, false, false],
  ["Neha Agarwal", "+919000020007", "D-302, Rambaug Colony", false, 0, true, false],
  ["Imran Khan", "+919000020008", "2nd floor, Sai Plaza, Paud Road", true, 2500, true, true],
  ["Lata Gokhale", "+919000020009", "Bungalow 3, Dahanukar Colony", true, 3000, true, true],
  ["Arjun Nair", "+919000020010", "E-11, Mahatma Society", false, 0, true, true],
];

/** Insert the fictional demo store. Data is relative to `now` so the dashboard always looks live. */
export async function seedDemo(db: Db, now = Date.now()): Promise<void> {
  const orgId = newId();
  const today = startOfDayIST(now);
  await db.insert(schema.orgs).values({
    id: orgId,
    name: "Annapurna Kirana Stores (Demo)",
    storeType: "kirana",
    ownerPhone: DEMO_OWNER_PHONE,
    whatsappPhone: DEMO_OWNER_PHONE,
    address: "Shop 4, Shantiban Society, Karve Road, Kothrud",
    city: "Pune, Maharashtra 411038",
    gstin: "27AAAPZ1234C1Z8",
    composition: false,
    upiVpa: "annapurna.demo@upi",
    deliveryRadiusKm: 2,
    minOrderPaise: 10000,
    openMinute: 7 * 60,
    closeMinute: 22 * 60,
    slotMinutes: 120,
    qrToken: DEMO_QR_TOKEN,
    isDemo: true,
  });
  await db.insert(schema.staffUsers).values([
    { id: newId(), orgId, phone: DEMO_OWNER_PHONE, name: "Ramesh Patil", role: "owner" },
    { id: newId(), orgId, phone: DEMO_STAFF_PHONE, name: "Sachin (counter)", role: "staff" },
  ]);

  const products = PRODUCTS.map(([name, brand, category, unit, price, mrp, hsn, gst, stock, min, schedule]) => ({
    id: newId(),
    orgId,
    name,
    brand,
    category,
    unit,
    pricePaise: price,
    mrpPaise: mrp,
    hsn,
    gstRateBp: gst,
    schedule: schedule ?? "none",
    trackStock: true,
    stockMilli: stock * 1000,
    minStockMilli: min * 1000,
  }));
  await db.insert(schema.products).values(products);
  const byName = (n: string) => products.find((p) => p.name.startsWith(n))!;

  const iso = (d: number) => new Date(today + d * DAY).toISOString().slice(0, 10);
  await db.insert(schema.batches).values([
    { id: newId(), orgId, productId: byName("Full Cream").id, batchNo: "AM2611", expiry: iso(1), qtyMilli: 10_000 },
    { id: newId(), orgId, productId: byName("Curd").id, batchNo: "CH1124", expiry: iso(-1), qtyMilli: 2000 },
    { id: newId(), orgId, productId: byName("Brown Bread").id, batchNo: "BR4471", expiry: iso(3), qtyMilli: 8000 },
    { id: newId(), orgId, productId: byName("Paneer").id, batchNo: "GW0907", expiry: iso(6), qtyMilli: 6000 },
    { id: newId(), orgId, productId: byName("Paracetamol").id, batchNo: "DL25K09", expiry: iso(22), qtyMilli: 10_000 },
    { id: newId(), orgId, productId: byName("Paracetamol").id, batchNo: "DL26B02", expiry: iso(400), qtyMilli: 20_000 },
    { id: newId(), orgId, productId: byName("Amoxicillin").id, batchNo: "AMX7731", expiry: iso(180), qtyMilli: 12_000 },
    { id: newId(), orgId, productId: byName("Chakki Atta").id, batchNo: "GH0925", expiry: iso(75), qtyMilli: 14_000 },
  ]);

  const customers = CUSTOMERS.map(([name, phone, address, khata, limit]) => ({
    id: newId(),
    orgId,
    phone,
    name,
    address,
    khataEnabled: khata,
    creditLimitPaise: limit * 100,
    publicToken: newToken(),
    createdAt: new Date(now - 60 * DAY),
  }));
  await db.insert(schema.customers).values(customers);
  const consents: (typeof schema.consentRecords.$inferInsert)[] = [];
  CUSTOMERS.forEach(([, , , , , service, marketing], i) => {
    const at = new Date(now - 55 * DAY + i * 3_600_000);
    if (service) consents.push({ id: newId(), orgId, customerId: customers[i].id, purpose: "service", granted: true, noticeVersion: NOTICE_VERSION, channel: "qr", createdAt: at });
    if (marketing) consents.push({ id: newId(), orgId, customerId: customers[i].id, purpose: "marketing", granted: true, noticeVersion: NOTICE_VERSION, channel: "qr", createdAt: at });
  });
  // One customer opted out of offers later (shows the log keeps history).
  consents.push({ id: newId(), orgId, customerId: customers[1].id, purpose: "marketing", granted: true, noticeVersion: NOTICE_VERSION, channel: "qr", createdAt: new Date(now - 50 * DAY) });
  consents.push({ id: newId(), orgId, customerId: customers[1].id, purpose: "marketing", granted: false, noticeVersion: NOTICE_VERSION, channel: "whatsapp", createdAt: new Date(now - 20 * DAY) });
  await db.insert(schema.consentRecords).values(consents);

  // Deterministic pseudo-random history.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let orderSeq = 0;
  let invoiceSeq = 0;
  const sellable = products.filter((p) => p.schedule === "none");
  const pickLines = () => {
    const n = 1 + Math.floor(rand() * 4);
    const picked = new Map<string, (typeof products)[number]>();
    while (picked.size < n) {
      const p = sellable[Math.floor(rand() * sellable.length)];
      picked.set(p.id, p);
    }
    return [...picked.values()].map((p) => {
      const qtyMilli = (p.unit === "kg" ? 500 * (1 + Math.floor(rand() * 4)) : 1000 * (1 + Math.floor(rand() * 2)));
      return { p, qtyMilli, amount: lineAmount(p.pricePaise, qtyMilli) };
    });
  };

  const khata: (typeof schema.khataEntries.$inferInsert)[] = [];
  const addInvoice = async (at: number, customer: (typeof customers)[number] | null, lines: ReturnType<typeof pickLines>, mode: "cash" | "upi" | "khata", orderId: string | null) => {
    invoiceSeq++;
    const inv = computeInvoice(lines.map((l) => ({ name: l.p.name, hsn: l.p.hsn, qtyMilli: l.qtyMilli, unitPrice: l.p.pricePaise, gstRateBp: l.p.gstRateBp })), { composition: false });
    const id = newId();
    const number = invoiceNumber(invoiceSeq, at);
    await db.insert(schema.invoices).values({
      id, orgId, number, kind: inv.kind, customerId: customer?.id ?? null, customerName: customer?.name ?? "", customerPhone: customer?.phone ?? "",
      orderId, paymentMode: mode, taxablePaise: inv.taxable, cgstPaise: inv.cgst, sgstPaise: inv.sgst, totalPaise: inv.total, createdAt: new Date(at),
    });
    await db.insert(schema.invoiceItems).values(inv.lines.map((l, i) => ({
      id: newId(), orgId, invoiceId: id, productId: lines[i].p.id, name: l.name, hsn: l.hsn, unit: lines[i].p.unit, qtyMilli: l.qtyMilli,
      unitPricePaise: l.unitPrice, gstRateBp: l.gstRateBp, taxablePaise: l.taxable, cgstPaise: l.cgst, sgstPaise: l.sgst, totalPaise: l.total,
    })));
    if (mode === "khata" && customer) khata.push({ id: newId(), orgId, customerId: customer.id, kind: "credit", amountPaise: inv.total, method: orderId ? "order" : "bill", orderId, invoiceId: id, note: `Bill ${number}`, createdAt: new Date(at) });
    return id;
  };

  // 30 days of delivered QR orders and counter bills.
  for (let d = 29; d >= 0; d--) {
    const dayStart = today - d * DAY;
    const ordersToday = d === 0 ? 2 : 1 + Math.floor(rand() * 3);
    for (let k = 0; k < ordersToday; k++) {
      const at = dayStart + (9 + Math.floor(rand() * 10)) * 3_600_000;
      if (at > now - 3_600_000) continue;
      const customer = customers[Math.floor(rand() * 7)];
      const lines = pickLines();
      const total = lines.reduce((a, l) => a + l.amount, 0);
      const mode = customer.khataEnabled && rand() < 0.4 ? "khata" : rand() < 0.5 ? "upi" : "cod";
      orderSeq++;
      const orderId = newId();
      const invoiceId = await addInvoice(at + 3_600_000, customer, lines, mode === "cod" ? "cash" : mode, orderId);
      await db.insert(schema.orders).values({
        id: orderId, orgId, number: orderSeq, customerId: customer.id, publicToken: newToken(), fulfilment: rand() < 0.75 ? "delivery" : "pickup",
        slotStart: new Date(at + 1800_000), slotEnd: new Date(at + 1800_000 + 7_200_000), address: customer.address, paymentMode: mode, paid: mode !== "khata",
        status: "delivered", totalPaise: total, invoiceId, createdAt: new Date(at), updatedAt: new Date(at + 3_600_000),
      });
      await db.insert(schema.orderItems).values(lines.map((l) => ({
        id: newId(), orgId, orderId, productId: l.p.id, name: l.p.name, unit: l.p.unit, qtyMilli: l.qtyMilli, unitPricePaise: l.p.pricePaise, amountPaise: l.amount, hsn: l.p.hsn, gstRateBp: l.p.gstRateBp,
      })));
      await db.insert(schema.orderEvents).values(["placed", "accepted", "packed", "delivered"].map((s, i) => ({ id: newId(), orgId, orderId, status: s, createdAt: new Date(at + i * 1_200_000) })));
    }
    const bills = d === 0 ? 3 : 2 + Math.floor(rand() * 4);
    for (let k = 0; k < bills; k++) {
      const at = dayStart + (8 + Math.floor(rand() * 13)) * 3_600_000;
      if (at > now - 600_000) continue;
      const walkIn = rand() < 0.5;
      const customer = walkIn ? null : customers[Math.floor(rand() * customers.length)];
      const mode = customer?.khataEnabled && rand() < 0.4 ? "khata" : rand() < 0.6 ? "upi" : "cash";
      await addInvoice(at, customer, pickLines(), mode, null);
    }
  }

  // Payments against khata: most customers paid part of their balance.
  const owed = new Map<string, number>();
  for (const e of khata) owed.set(e.customerId, (owed.get(e.customerId) ?? 0) + e.amountPaise);
  for (const [customerId, amt] of owed) {
    const pay = Math.floor((amt * (0.3 + rand() * 0.5)) / 10000) * 10000;
    if (pay > 0) khata.push({ id: newId(), orgId, customerId, kind: "payment", amountPaise: pay, method: rand() < 0.5 ? "upi" : "cash", note: "Part payment", createdAt: new Date(now - Math.floor(rand() * 12) * DAY - 7_200_000) });
  }
  if (khata.length) await db.insert(schema.khataEntries).values(khata);

  // Today's live queue: a few open orders at different stages.
  const open: [number, "placed" | "accepted" | "packed" | "out_for_delivery", "delivery" | "pickup", "cod" | "upi" | "khata"][] = [
    [0, "placed", "delivery", "upi"],
    [2, "placed", "pickup", "cod"],
    [3, "accepted", "delivery", "khata"],
    [4, "packed", "delivery", "cod"],
  ];
  for (const [ci, status, fulfilment, mode] of open) {
    const customer = customers[ci];
    const lines = pickLines();
    const at = now - (status === "placed" ? 10 : 50) * 60_000;
    orderSeq++;
    const orderId = newId();
    const slotStart = Math.ceil((now + 30 * 60_000) / 3_600_000) * 3_600_000;
    await db.insert(schema.orders).values({
      id: orderId, orgId, number: orderSeq, customerId: customer.id, publicToken: newToken(), fulfilment, slotStart: new Date(slotStart), slotEnd: new Date(slotStart + 7_200_000),
      address: fulfilment === "delivery" ? customer.address : "", note: ci === 0 ? "Please ring the bell twice" : "", paymentMode: mode, status, totalPaise: lines.reduce((a, l) => a + l.amount, 0),
      createdAt: new Date(at), updatedAt: new Date(at),
    });
    await db.insert(schema.orderItems).values(lines.map((l) => ({
      id: newId(), orgId, orderId, productId: l.p.id, name: l.p.name, unit: l.p.unit, qtyMilli: l.qtyMilli, unitPricePaise: l.p.pricePaise, amountPaise: l.amount, hsn: l.p.hsn, gstRateBp: l.p.gstRateBp,
    })));
    await db.insert(schema.orderEvents).values({ id: newId(), orgId, orderId, status: "placed", createdAt: new Date(at) });
  }
  await db.update(schema.orgs).set({ orderSeq, invoiceSeq }).where(eq(schema.orgs.id, orgId));
}

export async function seedIfEmpty(db: Db): Promise<boolean> {
  const [{ n }] = await db.select({ n: count() }).from(schema.orgs);
  if (n > 0) return false;
  await seedDemo(db);
  return true;
}
