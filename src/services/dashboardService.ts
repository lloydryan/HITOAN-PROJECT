import { collection, getDocs } from "firebase/firestore";
import { db, isDemoMode } from "../firebase";
import { CostLog, Order, Payment, PaymentMethod } from "../types";

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
  topItemsReport: Array<{ name: string; qty: number; gross: number }>;
  paymentMethodBreakdown: Array<{ method: PaymentMethod; count: number; total: number }>;
  salesTransactions: Array<{
    orderId: string;
    orderNumber: string;
    createdAt: string;
    orderType: string;
    tableNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    amountPaid: number;
    amountDue: number;
    change: number;
    discountType: string;
    discountAmount: number;
    subtotal: number;
    tax: number;
    total: number;
    items: string;
  }>;
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
  if (isDemoMode || !db) {
    const now = new Date();
    return {
      monthLabel: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(now),
      previousMonthLabel: "",
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      paidOrdersCount: 0,
      unpaidOrdersCount: 0,
      salesByDay: [],
      topItems: [],
      topItemsReport: [],
      paymentMethodBreakdown: [],
      salesTransactions: [],
      previousMonthSales: 0,
      previousMonthCost: 0,
      previousMonthProfit: 0,
      salesChangePct: null,
      costChangePct: null,
      profitChangePct: null,
      monthlyComparison: [],
    };
  }
  const [ordersSnap, costsSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "costs")),
    getDocs(collection(db, "payments"))
  ]);

  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
  const costs = costsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as CostLog[];
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[];
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
  const selectedPayments = payments.filter((p) => {
    const at = p.createdAt?.toDate();
    return !!at && at >= selectedStart && at < selectedEnd;
  });
  const paymentByOrderId = new Map<string, Payment>();
  selectedPayments.forEach((payment) => {
    const current = paymentByOrderId.get(payment.orderId);
    const currentAt = current?.createdAt?.toDate().getTime() ?? -1;
    const nextAt = payment.createdAt?.toDate().getTime() ?? -1;
    if (!current || nextAt >= currentAt) paymentByOrderId.set(payment.orderId, payment);
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

  const topItemsMap = new Map<string, { qty: number; gross: number }>();
  selectedPaid.forEach((order) => {
    order.items.forEach((item) => {
      const current = topItemsMap.get(item.nameSnapshot) ?? { qty: 0, gross: 0 };
      topItemsMap.set(item.nameSnapshot, {
        qty: current.qty + item.qty,
        gross: round2(current.gross + item.subtotal)
      });
    });
  });

  const salesByDay = [...salesByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, total]) => ({ day, total }));

  const topItemsReport = [...topItemsMap.entries()]
    .map(([name, value]) => ({ name, qty: value.qty, gross: round2(value.gross) }))
    .sort((a, b) => (b.qty === a.qty ? b.gross - a.gross : b.qty - a.qty));

  const topItems = topItemsReport
    .map(({ name, qty }) => ({ name, qty }))
    .slice(0, 8);

  const paymentMethodMap = new Map<PaymentMethod, { count: number; total: number }>();
  selectedPayments.forEach((p) => {
    const method = p.method;
    const current = paymentMethodMap.get(method) ?? { count: 0, total: 0 };
    const computedTotal = Number(p.amountDue ?? (p.amountPaid - p.change));
    paymentMethodMap.set(method, {
      count: current.count + 1,
      total: round2(current.total + computedTotal)
    });
  });
  const paymentMethodBreakdown = [...paymentMethodMap.entries()]
    .map(([method, value]) => ({
      method,
      count: value.count,
      total: round2(value.total)
    }))
    .sort((a, b) => b.count - a.count);

  const salesTransactions = selectedOrders
    .slice()
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate().getTime() ?? 0;
      const bTime = b.createdAt?.toDate().getTime() ?? 0;
      return bTime - aTime;
    })
    .map((order) => {
      const payment = paymentByOrderId.get(order.id);
      const amountDue = Number(payment?.amountDue ?? order.total);
      const amountPaid = Number(payment?.amountPaid ?? 0);
      const change = Number(payment?.change ?? 0);
      const discountAmount = Number(payment?.discountAmount ?? 0);
      const items = order.items
        .map((item) => `${item.nameSnapshot} x${item.qty} @${round2(item.priceSnapshot)}`)
        .join(" | ");
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt?.toDate().toISOString() ?? "",
        orderType: order.type,
        tableNumber: order.tableNumber ?? "",
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: payment?.method ?? "",
        amountPaid: round2(amountPaid),
        amountDue: round2(amountDue),
        change: round2(change),
        discountType: payment?.discountType ?? "none",
        discountAmount: round2(discountAmount),
        subtotal: round2(order.subtotal),
        tax: round2(order.tax),
        total: round2(order.total),
        items
      };
    });

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
    topItemsReport,
    paymentMethodBreakdown,
    salesTransactions,
    previousMonthSales,
    previousMonthCost,
    previousMonthProfit,
    salesChangePct: pctChange(totalSales, previousMonthSales),
    costChangePct: pctChange(totalCost, previousMonthCost),
    profitChangePct: pctChange(totalProfit, previousMonthProfit),
    monthlyComparison
  };
}
