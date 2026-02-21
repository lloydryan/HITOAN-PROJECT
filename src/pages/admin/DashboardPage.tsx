import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import {
  getDashboardMetrics,
  DashboardMetrics,
  DashboardPeriod
} from "../../services/dashboardService";
import { currency } from "../../utils/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [referenceDate, setReferenceDate] = useState<string>(todayIso());

  useEffect(() => {
    setLoading(true);
    getDashboardMetrics({ period, referenceDate }).then(setMetrics).finally(() => setLoading(false));
  }, [period, referenceDate]);

  if (loading) return <div className="spinner-border text-primary" />;
  if (!metrics) return <div>No metrics available.</div>;

  return (
    <div className="d-grid gap-3">
      <div className="card">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-sm-4 col-lg-3">
              <label className="form-label mb-1">Filter Period</label>
              <select
                className="form-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
              >
                <option value="day">By Date</option>
                <option value="week">By Week</option>
                <option value="month">By Month</option>
                <option value="year">By Year</option>
              </select>
            </div>
            <div className="col-sm-4 col-lg-3">
              <label className="form-label mb-1">Reference Date</label>
              <input
                type="date"
                className="form-control"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
              />
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
    </div>
  );
}
