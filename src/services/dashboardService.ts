import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Order } from "../types";

export interface DashboardMetrics {
  totalSales: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  salesByDay: Array<{ day: string; total: number }>;
  topItems: Array<{ name: string; qty: number }>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const q = query(collection(db, "orders"), where("status", "!=", "cancelled"));
  const snap = await getDocs(q);
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];

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
