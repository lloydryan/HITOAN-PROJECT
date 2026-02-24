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

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [referenceMonth, setReferenceMonth] = useState<string>(monthIsoNow());

  useEffect(() => {
    setLoading(true);
    getDashboardMetrics({ referenceMonth }).then(setMetrics).finally(() => setLoading(false));
  }, [referenceMonth]);

  if (loading) return <div className="spinner-border text-primary" />;
  if (!metrics) return <div>No metrics available.</div>;

  return (
    <div className="d-grid gap-3">
      <div className="card">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-sm-4 col-lg-3">
              <label className="form-label mb-1">Month</label>
              <input
                type="month"
                className="form-control"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
              />
            </div>
            <div className="col-sm-8 col-lg-6">
              <div className="small text-muted">
                Showing <strong>{metrics.monthLabel}</strong> compared to <strong>{metrics.previousMonthLabel}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Total Sales (Paid)</small>
              <h3>{currency(metrics.totalSales)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Paid Orders</small>
              <h3>{metrics.paidOrdersCount}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Unpaid Orders</small>
              <h3>{metrics.unpaidOrdersCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-body">
              <h5>Sales by Day</h5>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={metrics.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="total" stroke="#0d6efd" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-body">
              <h5>Top Selling Items</h5>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics.topItems}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#198754" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Total Sales</small>
              <h3>{currency(metrics.totalSales)}</h3>
              <small className={deltaClass(metrics.salesChangePct)}>{deltaText(metrics.salesChangePct)}</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Total Cost</small>
              <h3>{currency(metrics.totalCost)}</h3>
              <small className={deltaClass(metrics.costChangePct, true)}>{deltaText(metrics.costChangePct)}</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Net Profit</small>
              <h3>{currency(metrics.totalProfit)}</h3>
              <small className={deltaClass(metrics.profitChangePct)}>{deltaText(metrics.profitChangePct)}</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <small className="text-muted">Profit Margin</small>
              <h3>{metrics.profitMargin.toFixed(2)}%</h3>
              <small className="text-muted">
                Paid Orders: {metrics.paidOrdersCount} | Unpaid: {metrics.unpaidOrdersCount}
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5>Sales vs Cost (Last 6 Months)</h5>
              <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics.monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" fill="#0d6efd" name="Sales" />
                    <Bar dataKey="cost" fill="#dc3545" name="Cost" />
                    <Bar dataKey="profit" fill="#198754" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
