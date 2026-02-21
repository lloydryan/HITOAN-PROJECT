import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Order } from "../types";

export interface DashboardMetrics {
  totalSales: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  salesByDay: Array<{ day: string; total: number }>;
  topItems: Array<{ name: string; qty: number }>;
}

export type DashboardPeriod = "day" | "week" | "month" | "year";

export interface DashboardFilter {
  period: DashboardPeriod;
  referenceDate: string; // YYYY-MM-DD
}

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function addMonths(d: Date, months: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

function addYears(d: Date, years: number) {
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + years);
  return out;
}

function getRange(referenceDate: string, period: DashboardPeriod) {
  const ref = startOfDay(new Date(referenceDate));
  if (period === "day") {
    return { from: ref, toExclusive: addDays(ref, 1) };
  }

  if (period === "week") {
    // Monday-start week
    const day = ref.getDay(); // 0 Sun ... 6 Sat
    const offset = day === 0 ? -6 : 1 - day;
    const weekStart = addDays(ref, offset);
    return { from: weekStart, toExclusive: addDays(weekStart, 7) };
  }

  if (period === "month") {
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
    return { from: monthStart, toExclusive: addMonths(monthStart, 1) };
  }

  const yearStart = new Date(ref.getFullYear(), 0, 1);
  return { from: yearStart, toExclusive: addYears(yearStart, 1) };
}

export async function getDashboardMetrics(filter: DashboardFilter): Promise<DashboardMetrics> {
  const snap = await getDocs(collection(db, "orders"));
  const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
  const nonCancelled = allOrders.filter((o) => o.status !== "cancelled");

  const { from, toExclusive } = getRange(filter.referenceDate, filter.period);
  const orders = nonCancelled.filter((o) => {
    const at = o.createdAt?.toDate();
    return !!at && at >= from && at < toExclusive;
  });

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const unpaidOrders = orders.filter((o) => o.paymentStatus === "unpaid");
  const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);

  const salesByDayMap = new Map<string, number>();
  for (const order of paidOrders) {
    const day = order.createdAt?.toDate().toISOString().slice(0, 10) ?? "N/A";
    salesByDayMap.set(day, Number(((salesByDayMap.get(day) ?? 0) + order.total).toFixed(2)));
  }

  const topItemsMap = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      topItemsMap.set(item.nameSnapshot, (topItemsMap.get(item.nameSnapshot) ?? 0) + item.qty);
    }
  }

  const salesByDay = [...salesByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, total]) => ({ day, total }));

  const topItems = [...topItemsMap.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return {
    totalSales: Number(totalSales.toFixed(2)),
    paidOrdersCount: paidOrders.length,
    unpaidOrdersCount: unpaidOrders.length,
    salesByDay,
    topItems
  };
}
