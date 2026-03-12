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
import { currency } from "../../utils/format";

function monthIsoNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function deltaText(value: number | null) {
  if (value === null) return "No previous month data";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}% vs previous month`;
}

function deltaClass(value: number | null, inverse = false) {
  if (value === null || value === 0) return "text-muted";
  const positive = value > 0;
  if (inverse) return positive ? "text-danger" : "text-success";
  return positive ? "text-success" : "text-danger";
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [referenceMonth, setReferenceMonth] = useState<string>(monthIsoNow());

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

  if (loading) return <div className="spinner-border text-primary" />;
  if (!metrics) return <div>No metrics available.</div>;

  return (
    <div className="pos-dashboard">
      <div className="pos-dashboard-header">
        <div className="pos-dashboard-filters">
          <div>
            <label className="pos-dashboard-label">Month</label>
            <input
              type="month"
              className="form-control pos-dashboard-input"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
            />
          </div>
          <div className="pos-dashboard-compare">
            <span className="pos-dashboard-compare-text">
              {metrics.monthLabel} vs {metrics.previousMonthLabel}
            </span>
          </div>
          <div className="pos-dashboard-export">
            <button type="button" className="btn pos-dashboard-export-btn" onClick={exportSalesReport}>
              Export Sales Report
            </button>
            <button type="button" className="btn pos-dashboard-export-btn pos-dashboard-export-btn-secondary" onClick={exportSalesTransactions}>
              Export Transactions
            </button>
          </div>
        </div>
      </div>

      <div className="pos-dashboard-kpis">
        <div className="pos-dashboard-kpi-card pos-dashboard-kpi-primary">
          <span className="pos-dashboard-kpi-label">Total Sales</span>
          <span className="pos-dashboard-kpi-value">{currency(metrics.totalSales)}</span>
          <small className={deltaClass(metrics.salesChangePct)}>{deltaText(metrics.salesChangePct)}</small>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Paid Orders</span>
          <span className="pos-dashboard-kpi-value">{metrics.paidOrdersCount}</span>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Unpaid Orders</span>
          <span className="pos-dashboard-kpi-value">{metrics.unpaidOrdersCount}</span>
        </div>
        <div className="pos-dashboard-kpi-card">
          <span className="pos-dashboard-kpi-label">Net Profit</span>
          <span className="pos-dashboard-kpi-value">{currency(metrics.totalProfit)}</span>
          <small className={deltaClass(metrics.profitChangePct)}>{deltaText(metrics.profitChangePct)}</small>
        </div>
      </div>

      <div className="pos-dashboard-charts">
        <div className="pos-dashboard-chart-card">
          <h5 className="pos-dashboard-chart-title">Daily Sales</h5>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={metrics.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="day" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip />
                <Line dataKey="total" stroke="#D32F2F" strokeWidth={2} dot={{ fill: "#D32F2F" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pos-dashboard-chart-card">
          <h5 className="pos-dashboard-chart-title">Top Menu Items</h5>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={metrics.topItems} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis type="number" stroke="#666" fontSize={12} />
                <YAxis dataKey="name" type="category" width={100} stroke="#666" fontSize={12} />
                <Tooltip />
                <Bar dataKey="qty" fill="#D32F2F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="pos-dashboard-stats">
        <div className="pos-dashboard-stat-card">
          <span className="pos-dashboard-stat-label">Total Cost</span>
          <span className="pos-dashboard-stat-value">{currency(metrics.totalCost)}</span>
          <small className={deltaClass(metrics.costChangePct, true)}>{deltaText(metrics.costChangePct)}</small>
        </div>
        <div className="pos-dashboard-stat-card">
          <span className="pos-dashboard-stat-label">Profit Margin</span>
          <span className="pos-dashboard-stat-value">{metrics.profitMargin.toFixed(2)}%</span>
        </div>
      </div>

      <div className="pos-dashboard-chart-card pos-dashboard-chart-wide">
        <h5 className="pos-dashboard-chart-title">Sales vs Cost (Last 6 Months)</h5>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={metrics.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="month" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#D32F2F" name="Sales" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="#666" name="Cost" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#2E7D32" name="Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
