import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CostLog, Order } from "../types";

export interface DashboardMetrics {
  monthLabel: string;
  previousMonthLabel: string;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  salesByDay: Array<{ day: string; total: number }>;
  topItems: Array<{ name: string; qty: number }>;
  previousMonthSales: number;
  previousMonthCost: number;
  previousMonthProfit: number;
  salesChangePct: number | null;
  costChangePct: number | null;
  profitChangePct: number | null;
  monthlyComparison: Array<{ month: string; sales: number; cost: number; profit: number }>;
}

export interface DashboardFilter {
  referenceMonth: string; // YYYY-MM
}

function monthStartFromIso(referenceMonth: string) {
  const [y, m] = referenceMonth.split("-").map(Number);
  if (!y || !m) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(y, m - 1, 1);
}

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return round2(((current - previous) / previous) * 100);
}

export async function getDashboardMetrics(filter: DashboardFilter): Promise<DashboardMetrics> {
  const [ordersSnap, costsSnap] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "costs"))
  ]);

  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
  const costs = costsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as CostLog[];
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");

  const selectedStart = monthStartFromIso(filter.referenceMonth);
  const selectedEnd = addMonths(selectedStart, 1);
  const previousStart = addMonths(selectedStart, -1);
  const previousEnd = selectedStart;

  const selectedOrders = nonCancelled.filter((o) => {
    const at = o.createdAt?.toDate();
    return !!at && at >= selectedStart && at < selectedEnd;
  });
  const selectedPaid = selectedOrders.filter((o) => o.paymentStatus === "paid");

  const selectedCosts = costs.filter((c) => {
    const at = c.createdAt?.toDate();
    return !!at && at >= selectedStart && at < selectedEnd;
  });

  const previousPaid = nonCancelled.filter((o) => {
    const at = o.createdAt?.toDate();
    return !!at && at >= previousStart && at < previousEnd && o.paymentStatus === "paid";
  });
  const previousCosts = costs.filter((c) => {
    const at = c.createdAt?.toDate();
    return !!at && at >= previousStart && at < previousEnd;
  });

  const totalSales = round2(selectedPaid.reduce((sum, o) => sum + o.total, 0));
  const totalCost = round2(selectedCosts.reduce((sum, c) => sum + c.value, 0));
  const totalProfit = round2(totalSales - totalCost);
  const profitMargin = totalSales > 0 ? round2((totalProfit / totalSales) * 100) : 0;

  const previousMonthSales = round2(previousPaid.reduce((sum, o) => sum + o.total, 0));
  const previousMonthCost = round2(previousCosts.reduce((sum, c) => sum + c.value, 0));
  const previousMonthProfit = round2(previousMonthSales - previousMonthCost);

  const salesByDayMap = new Map<string, number>();
  selectedPaid.forEach((order) => {
    const day = order.createdAt?.toDate().toISOString().slice(0, 10);
    if (!day) return;
    salesByDayMap.set(day, round2((salesByDayMap.get(day) ?? 0) + order.total));
  });

  const topItemsMap = new Map<string, number>();
  selectedOrders.forEach((order) => {
    order.items.forEach((item) => {
      topItemsMap.set(item.nameSnapshot, (topItemsMap.get(item.nameSnapshot) ?? 0) + item.qty);
    });
  });

  const salesByDay = [...salesByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, total]) => ({ day, total }));

  const topItems = [...topItemsMap.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const trendStart = addMonths(selectedStart, -5);
  const salesByMonth = new Map<string, number>();
  const costByMonth = new Map<string, number>();

  nonCancelled.forEach((o) => {
    if (o.paymentStatus !== "paid") return;
    const at = o.createdAt?.toDate();
    if (!at || at < trendStart || at >= selectedEnd) return;
    const key = monthKey(at);
    salesByMonth.set(key, round2((salesByMonth.get(key) ?? 0) + o.total));
  });

  costs.forEach((c) => {
    const at = c.createdAt?.toDate();
    if (!at || at < trendStart || at >= selectedEnd) return;
    const key = monthKey(at);
    costByMonth.set(key, round2((costByMonth.get(key) ?? 0) + c.value));
  });

  const monthlyComparison = Array.from({ length: 6 }).map((_, idx) => {
    const d = addMonths(trendStart, idx);
    const key = monthKey(d);
    const sales = salesByMonth.get(key) ?? 0;
    const cost = costByMonth.get(key) ?? 0;
    return {
      month: monthLabel(d),
      sales,
      cost,
      profit: round2(sales - cost)
    };
  });

  return {
    monthLabel: monthLabel(selectedStart),
    previousMonthLabel: monthLabel(previousStart),
    totalSales,
    totalCost,
    totalProfit,
    profitMargin,
    paidOrdersCount: selectedPaid.length,
    unpaidOrdersCount: selectedOrders.filter((o) => o.paymentStatus === "unpaid").length,
    salesByDay,
    topItems,
    previousMonthSales,
    previousMonthCost,
    previousMonthProfit,
    salesChangePct: pctChange(totalSales, previousMonthSales),
    costChangePct: pctChange(totalCost, previousMonthCost),
    profitChangePct: pctChange(totalProfit, previousMonthProfit),
    monthlyComparison
  };
}
