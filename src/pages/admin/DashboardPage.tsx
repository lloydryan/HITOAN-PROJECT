import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashboardMetrics, getDashboardMetrics } from "../../services/dashboardService";
import { useToast } from "../../hooks/useToast";
import { currency, dt } from "../../utils/format";
import { ExcelIcon } from "../../components/icons/ExportIcons";
import StatusBadge from "../../components/common/StatusBadge";
import PaymentBadge from "../../components/common/PaymentBadge";

function monthIsoNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "-";
  }
}

function deltaText(value: number | null) {
  if (value === null) return "No previous month data";
  const arrow = value > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(value).toFixed(1)}% vs last month`;
}

function deltaClass(value: number | null, inverse = false) {
  if (value === null || value === 0) return "pos-dashboard-trend-neutral";
  const positive = value > 0;
  if (inverse) return positive ? "pos-dashboard-trend-negative" : "pos-dashboard-trend-positive";
  return positive ? "pos-dashboard-trend-positive" : "pos-dashboard-trend-negative";
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

type RecentOrderRow = DashboardMetrics["salesTransactions"][number];

export default function DashboardPage() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [referenceMonth, setReferenceMonth] = useState<string>(monthIsoNow());
  const [selectedOrder, setSelectedOrder] = useState<RecentOrderRow | null>(null);

  useEffect(() => {
    setLoading(true);
    getDashboardMetrics({ referenceMonth }).then(setMetrics).finally(() => setLoading(false));
  }, [referenceMonth]);

  const exportSalesReport = () => {
    if (!metrics) return;
    const hasSalesReportData =
      metrics.paymentMethodBreakdown.length > 0 ||
      metrics.topItemsReport.length > 0 ||
      metrics.salesByDay.length > 0;
    if (!hasSalesReportData) {
      showToast("No data", "No sales report data for the selected month.", "warning");
      return;
    }

    const csvLines = [
      ["Sales Report Month", referenceMonth].map(csvEscape).join(","),
      ["Generated At", new Date().toLocaleString("en-US")].map(csvEscape).join(","),
      ["Total Sales", metrics.totalSales.toFixed(2)].map(csvEscape).join(","),
      ["Paid Orders", metrics.paidOrdersCount].map(csvEscape).join(","),
      ["Unpaid Orders", metrics.unpaidOrdersCount].map(csvEscape).join(","),
      "",
      "Payment Method Breakdown",
      ["Method", "Count", "Sales Total"].map(csvEscape).join(","),
      ...(metrics.paymentMethodBreakdown.length
        ? metrics.paymentMethodBreakdown.map((row) =>
            [row.method.toUpperCase(), row.count, row.total.toFixed(2)].map(csvEscape).join(",")
          )
        : [["No payment records", "", ""].map(csvEscape).join(",")]),
      "",
      "Top Selling Items (Raw Data)",
      ["Item", "Qty Sold", "Gross Sales"].map(csvEscape).join(","),
      ...(metrics.topItemsReport.length
        ? metrics.topItemsReport.map((row) => [row.name, row.qty, row.gross.toFixed(2)].map(csvEscape).join(","))
        : [["No item sales", "", ""].map(csvEscape).join(",")]),
      "",
      "Sales By Day",
      ["Day", "Total Sales"].map(csvEscape).join(","),
      ...(metrics.salesByDay.length
        ? metrics.salesByDay.map((row) => [row.day, row.total.toFixed(2)].map(csvEscape).join(","))
        : [["No daily sales", ""].map(csvEscape).join(",")])
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-sales-report-${referenceMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Exported", `Sales report generated for ${referenceMonth}.`);
  };

  const exportSalesTransactions = () => {
    if (!metrics) return;
    if (!metrics.salesTransactions.length) {
      showToast("No data", "No sales transactions found for the selected month.", "warning");
      return;
    }

    const csvLines = [
      ["Sales Transactions Report Month", referenceMonth].map(csvEscape).join(","),
      ["Generated At", new Date().toLocaleString("en-US")].map(csvEscape).join(","),
      "",
      [
        "Order ID",
        "Order Number",
        "Created At",
        "Order Type",
        "Table Number",
        "Order Status",
        "Payment Status",
        "Payment Method",
        "Amount Due",
        "Amount Paid",
        "Change",
        "Discount Type",
        "Discount Amount",
        "Subtotal",
        "Tax",
        "Total",
        "Items"
      ]
        .map(csvEscape)
        .join(","),
      ...(metrics.salesTransactions.length
        ? metrics.salesTransactions.map((row) =>
            [
              row.orderId,
              row.orderNumber,
              row.createdAt,
              row.orderType,
              row.tableNumber,
              row.status,
              row.paymentStatus,
              row.paymentMethod,
              row.amountDue.toFixed(2),
              row.amountPaid.toFixed(2),
              row.change.toFixed(2),
              row.discountType,
              row.discountAmount.toFixed(2),
              row.subtotal.toFixed(2),
              row.tax.toFixed(2),
              row.total.toFixed(2),
              row.items
            ]
              .map(csvEscape)
              .join(",")
          )
        : [["No transactions found for selected month"].map(csvEscape).join(",")])
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-transactions-${referenceMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Exported", `Sales transactions report generated for ${referenceMonth}.`);
  };

  if (loading) return <div className="pos-dashboard-loading"><div className="spinner-border text-danger" /></div>;
  if (!metrics) return <div className="pos-dashboard-loading">No metrics available.</div>;

  const recentOrders = metrics.salesTransactions.slice(0, 10);

  return (
    <div className="pos-dashboard">
      {/* Page Header: filters left, actions right */}
      <header className="pos-dashboard-page-header">
        <h1 className="pos-dashboard-page-title">Dashboard</h1>
        <p className="pos-dashboard-today-stat">
          Today: {metrics.todayOrdersCount} {metrics.todayOrdersCount === 1 ? "order" : "orders"} | {currency(metrics.todayRevenue)} revenue
        </p>
        <div className="pos-dashboard-header-row">
          <div className="pos-dashboard-filters">
            <label className="pos-dashboard-label">Month</label>
            <input
              type="month"
              className="form-control pos-dashboard-input pos-dashboard-month-select"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              aria-label="Select month"
            />
          </div>
          <div className="pos-dashboard-actions">
            <button type="button" className="btn pos-dashboard-export-btn pos-dashboard-export-btn-with-icon" onClick={exportSalesReport}>
              <ExcelIcon size={20} />
              Export Sales Report
            </button>
            <button type="button" className="btn pos-dashboard-export-btn-secondary pos-dashboard-export-btn-with-icon" onClick={exportSalesTransactions}>
              <ExcelIcon size={20} />
              Export Transactions
            </button>
          </div>
        </div>
      </header>

      {/* KPI Metrics: 4 cards */}
      <section className="pos-dashboard-kpis">
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Total Sales</span>
          <span className="pos-dashboard-kpi-value">{currency(metrics.totalSales)}</span>
          <span className={`pos-dashboard-kpi-trend ${deltaClass(metrics.salesChangePct)}`}>
            {deltaText(metrics.salesChangePct)}
          </span>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Paid Orders</span>
          <span className="pos-dashboard-kpi-value">{metrics.paidOrdersCount}</span>
          <span className="pos-dashboard-kpi-trend pos-dashboard-kpi-trend-suffix">
            {metrics.paidOrdersCount === 1 ? "order" : "orders"}
          </span>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Unpaid Orders</span>
          <span className="pos-dashboard-kpi-value">{metrics.unpaidOrdersCount}</span>
          <span className="pos-dashboard-kpi-trend pos-dashboard-kpi-trend-suffix">
            {metrics.unpaidOrdersCount === 1 ? "order" : "orders"}
          </span>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Net Profit</span>
          <span className="pos-dashboard-kpi-value">{currency(metrics.totalProfit)}</span>
          <span className={`pos-dashboard-kpi-trend ${deltaClass(metrics.profitChangePct)}`}>
            {deltaText(metrics.profitChangePct)}
          </span>
        </div>
      </section>

      {/* Secondary metrics: Total Cost, Profit Margin */}
      <section className="pos-dashboard-stats">
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Total Cost</span>
          <span className="pos-dashboard-kpi-value">{currency(metrics.totalCost)}</span>
          <span className={`pos-dashboard-kpi-trend ${deltaClass(metrics.costChangePct, true)}`}>
            {deltaText(metrics.costChangePct)}
          </span>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Profit Margin</span>
          <span className="pos-dashboard-kpi-value">{metrics.profitMargin.toFixed(1)}%</span>
        </div>
      </section>

      {/* Sales Analytics: two charts side-by-side */}
      <section className="pos-dashboard-charts">
        <div className="pos-dashboard-chart-card">
          <h5 className="pos-dashboard-chart-title">Daily Sales Trend</h5>
          <div className="pos-dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={metrics.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="day" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [currency(v), "Sales"]} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--pos-primary)"
                  strokeWidth={3}
                  dot={{ fill: "var(--pos-primary)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="pos-dashboard-chart-card">
          <h5 className="pos-dashboard-chart-title">Top Menu Items</h5>
          <div className="pos-dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={metrics.topItems} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={100} stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="qty" fill="var(--pos-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="pos-dashboard-chart-card pos-dashboard-chart-wide">
          <h5 className="pos-dashboard-chart-title">Sales vs Cost (Last 6 Months)</h5>
          <div className="pos-dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={metrics.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [currency(v), ""]} />
                <Legend />
                <Bar dataKey="sales" fill="var(--pos-primary)" name="Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#666" name="Cost" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="var(--pos-status-success)" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Orders Table */}
      <section className="pos-dashboard-recent">
        <h5 className="pos-dashboard-chart-title">Recent Orders</h5>
        <div className="pos-dashboard-table-wrap">
          <table className="pos-dashboard-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pos-dashboard-table-empty">
                    No orders for the selected month
                  </td>
                </tr>
              ) : (
                recentOrders.map((row) => (
                  <tr
                    key={row.orderId}
                    className="pos-dashboard-recent-row"
                    onClick={() => setSelectedOrder(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedOrder(row)}
                  >
                    <td className="pos-dashboard-table-id">
                      <button
                        type="button"
                        className="pos-dashboard-order-id-link"
                        onClick={() => setSelectedOrder(row)}
                        title="View order details"
                        style={{ minHeight: 44, minWidth: 80 }}
                      >
                        #{row.orderNumber}
                      </button>
                    </td>
                    <td>{row.itemCount} {row.itemCount === 1 ? "item" : "items"}</td>
                    <td className="pos-dashboard-table-total">{currency(row.total)}</td>
                    <td>
                      <span className={`pos-dashboard-badge pos-dashboard-badge-${row.paymentStatus}`}>
                        {row.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="pos-dashboard-table-time">{formatTime(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-order-modal-title"
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 id="dashboard-order-modal-title" className="modal-title">
                  Order #{selectedOrder.orderNumber}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <dl className="row mb-0">
                  <dt className="col-sm-4">Type</dt>
                  <dd className="col-sm-8">
                    {selectedOrder.orderType === "takeout" ? "Takeout" : "Dine-in"}
                  </dd>
                  {selectedOrder.orderType === "dine-in" && (
                    <>
                      <dt className="col-sm-4">Table #</dt>
                      <dd className="col-sm-8">{selectedOrder.tableNumber || "-"}</dd>
                    </>
                  )}
                  <dt className="col-sm-4">Status</dt>
                  <dd className="col-sm-8">
                    <StatusBadge status={selectedOrder.status as import("../../types").OrderStatus} />
                  </dd>
                  <dt className="col-sm-4">Payment</dt>
                  <dd className="col-sm-8">
                    <PaymentBadge status={selectedOrder.paymentStatus as import("../../types").PaymentStatus} />
                  </dd>
                  <dt className="col-sm-4">Created</dt>
                  <dd className="col-sm-8">{dt(new Date(selectedOrder.createdAt))}</dd>
                  {selectedOrder.paymentMethod && (
                    <>
                      <dt className="col-sm-4">Payment Method</dt>
                      <dd className="col-sm-8 text-capitalize">{selectedOrder.paymentMethod}</dd>
                    </>
                  )}
                </dl>
                <h6 className="mt-3 mb-2">Items</h6>
                <ul className="list-unstyled mb-0">
                  {selectedOrder.items
                    ? selectedOrder.items.split(" | ").map((seg, idx) => {
                        const match = seg.match(/^(.+?)\s+x(\d+)\s+@([\d.]+)$/);
                        if (match) {
                          const [, name, qty, price] = match;
                          const subtotal = Number(qty) * Number(price);
                          return (
                            <li key={idx} className="d-flex justify-content-between py-1">
                              <span>{name} × {qty}</span>
                              <span>{currency(subtotal)}</span>
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="py-1">{seg}</li>
                        );
                      })
                    : null}
                </ul>
                <hr />
                <div className="d-flex justify-content-between">
                  <span>Subtotal</span>
                  <strong>{currency(selectedOrder.subtotal)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Tax (12%)</span>
                  <strong>{currency(selectedOrder.tax)}</strong>
                </div>
                <div className="d-flex justify-content-between crew-order-total-line">
                  <span>TOTAL</span>
                  <strong>{currency(selectedOrder.total)}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
