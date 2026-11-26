import { DAY_MS, startOfDayIST, startOfMonthIST } from "./time";

export interface SaleLike {
  /** Order or invoice; counter bills and delivered/active orders both count as sales. */
  customerId: string | null;
  total: number;
  at: number;
  items: { productId: string; name: string; qtyMilli: number; amount: number }[];
}

export interface DashboardInput {
  now: number;
  sales: readonly SaleLike[];
  khata: readonly { kind: "credit" | "payment"; amount: number; createdAt: number }[];
}

export interface Dashboard {
  salesToday: number;
  salesThisMonth: number;
  billsToday: number;
  avgBasket: number;
  creditOutstanding: number;
  recoveredThisMonth: number;
  topItems: { productId: string; name: string; qtyMilli: number; amount: number }[];
  repeatCustomers: number;
  activeCustomers: number;
  daily: { day: number; total: number }[];
}

/** Owner dashboard numbers. All windows are IST calendar days/months; top items and repeats use 30 days. */
export function buildDashboard({ now, sales, khata }: DashboardInput): Dashboard {
  const today = startOfDayIST(now);
  const month = startOfMonthIST(now);
  const since30 = today - 29 * DAY_MS;
  const todaySales = sales.filter((s) => s.at >= today);
  const recent = sales.filter((s) => s.at >= since30);

  const items = new Map<string, { productId: string; name: string; qtyMilli: number; amount: number }>();
  const perCustomer = new Map<string, number>();
  for (const s of recent) {
    for (const i of s.items) {
      const row = items.get(i.productId) ?? { productId: i.productId, name: i.name, qtyMilli: 0, amount: 0 };
      row.qtyMilli += i.qtyMilli;
      row.amount += i.amount;
      items.set(i.productId, row);
    }
    if (s.customerId) perCustomer.set(s.customerId, (perCustomer.get(s.customerId) ?? 0) + 1);
  }

  const daily: { day: number; total: number }[] = [];
  for (let d = 6; d >= 0; d--) {
    const start = today - d * DAY_MS;
    daily.push({ day: start, total: sales.filter((s) => s.at >= start && s.at < start + DAY_MS).reduce((a, s) => a + s.total, 0) });
  }

  const salesToday = todaySales.reduce((a, s) => a + s.total, 0);
  return {
    salesToday,
    salesThisMonth: sales.filter((s) => s.at >= month).reduce((a, s) => a + s.total, 0),
    billsToday: todaySales.length,
    avgBasket: todaySales.length ? Math.round(salesToday / todaySales.length) : 0,
    creditOutstanding: khata.reduce((a, e) => a + (e.kind === "credit" ? e.amount : -e.amount), 0),
    recoveredThisMonth: khata.filter((e) => e.kind === "payment" && e.createdAt >= month).reduce((a, e) => a + e.amount, 0),
    topItems: [...items.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    repeatCustomers: [...perCustomer.values()].filter((n) => n >= 2).length,
    activeCustomers: perCustomer.size,
    daily,
  };
}
