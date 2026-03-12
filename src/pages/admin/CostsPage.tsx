import { useEffect, useMemo, useState } from "react";
import { CostLog } from "../../types";
import { createCost, getCosts } from "../../services/costService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { costSchema, CostSchema } from "../../schemas/costSchema";
import { currency, dt } from "../../utils/format";
import { ExcelIcon } from "../../components/icons/ExportIcons";

type PeriodFilter = "day" | "month" | "year";

function toDayInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toMonthInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthBounds(monthInput: string) {
  const [yRaw, mRaw] = monthInput.split("-");
  const year = Number(yRaw);
  const month = Number(mRaw);
  if (!year || !month || month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { year, month, start, end };
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export default function CostsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [costs, setCosts] = useState<CostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [selectedDay, setSelectedDay] = useState<string>(() => toDayInput(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => toMonthInput(new Date()));
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));

  const load = () => getCosts().then(setCosts).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CostSchema>({
    resolver: zodResolver(costSchema)
  });

  const onSubmit = async (values: CostSchema) => {
    if (!user) return;
    try {
      await createCost(user, values);
      showToast("Success", "Cost logged");
      reset();
      await load();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const monthlyCosts = useMemo(() => {
    const bounds = monthBounds(selectedMonth);
    if (!bounds) return [];
    return costs.filter((c) => {
      const created = c.createdAt?.toDate();
      if (!created) return false;
      return created >= bounds.start && created < bounds.end;
    });
  }, [costs, selectedMonth]);

  const exportMonthlyReport = () => {
    const bounds = monthBounds(selectedMonth);
    if (!bounds) {
      showToast("Validation", "Please select a valid month.", "warning");
      return;
    }

    if (!monthlyCosts.length) {
      showToast("No data", "No cost records found for the selected month.", "warning");
      return;
    }

    const total = monthlyCosts.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const monthLabel = `${bounds.year}-${String(bounds.month).padStart(2, "0")}`;

    const header = ["Type", "Value", "Note", "Date"];
    const rows = monthlyCosts.map((c) => [
      c.type,
      Number(c.value).toFixed(2),
      c.note || "",
      dt(c.createdAt?.toDate())
    ]);

    const csvLines = [
      ["Cost Report Month", monthLabel].map(csvEscape).join(","),
      ["Generated At", new Date().toLocaleString("en-US")].map(csvEscape).join(","),
      ["Total Cost", total.toFixed(2)].map(csvEscape).join(","),
      "",
      header.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(","))
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cost-report-${monthLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Exported", `Monthly report generated for ${monthLabel}.`);
  };

  const filteredCosts = useMemo(() => {
    const start = new Date();
    const end = new Date();

    if (period === "day") {
      if (!selectedDay) return [];
      const picked = new Date(`${selectedDay}T00:00:00`);
      if (Number.isNaN(picked.getTime())) return [];
      start.setTime(picked.getTime());
      end.setTime(picked.getTime());
      end.setDate(end.getDate() + 1);
    } else if (period === "month") {
      const bounds = monthBounds(selectedMonth);
      if (!bounds) return [];
      start.setTime(bounds.start.getTime());
      end.setTime(bounds.end.getTime());
    } else {
      const year = Number(selectedYear);
      if (!year) return [];
      start.setFullYear(year, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(year + 1, 0, 1);
      end.setHours(0, 0, 0, 0);
    }

    return costs.filter((c) => {
      const created = c.createdAt?.toDate();
      if (!created) return false;
      return created >= start && created < end;
    });
  }, [costs, period, selectedDay, selectedMonth, selectedYear]);

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="card">
          <div className="card-body">
            <h5>Log Inventory Cost</h5>
            <form className="d-grid gap-2" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="form-label">Type</label>
                <input className="form-control" {...register("type")} />
                <small className="text-danger">{errors.type?.message}</small>
              </div>
              <div>
                <label className="form-label">Value</label>
                <input className="form-control" type="number" step="0.01" {...register("value")} />
                <small className="text-danger">{errors.value?.message}</small>
              </div>
              <div>
                <label className="form-label">Note</label>
                <textarea className="form-control" rows={3} {...register("note")} />
              </div>
              <button className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Create Cost Log"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col-lg-8">
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Cost Records</h5>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                  style={{ width: 120 }}
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                {period === "day" && (
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    style={{ width: 170 }}
                  />
                )}
                {period === "month" && (
                  <>
                    <input
                      type="month"
                      className="form-control form-control-sm"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{ width: 170 }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success pos-export-btn-with-icon"
                      onClick={exportMonthlyReport}
                    >
                      <ExcelIcon size={18} />
                      Export Monthly Report
                    </button>
                  </>
                )}
                {period === "year" && (
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    min={2000}
                    max={9999}
                    step={1}
                    placeholder="YYYY"
                    style={{ width: 120 }}
                  />
                )}
              </div>
            </div>
            {loading ? (
              <div className="spinner-border text-primary" />
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Type</th><th>Value</th><th>Note</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCosts.length ? (
                      filteredCosts.map((c) => (
                        <tr key={c.id}>
                          <td>{c.type}</td>
                          <td>{currency(c.value)}</td>
                          <td>{c.note || "-"}</td>
                          <td>{dt(c.createdAt?.toDate())}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-muted text-center py-3">
                          No cost records for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
