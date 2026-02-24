import { useEffect, useMemo, useState } from "react";
import { CostLog } from "../../types";
import { createCost, getCosts } from "../../services/costService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { costSchema, CostSchema } from "../../schemas/costSchema";
import { currency, dt } from "../../utils/format";

export default function CostsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [costs, setCosts] = useState<CostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");

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

  const filteredCosts = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (period === "day") {
      start.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
    } else if (period === "month") {
      start.setHours(0, 0, 0, 0);
      start.setDate(1);
    } else {
      start.setHours(0, 0, 0, 0);
      start.setMonth(0, 1);
    }

    return costs.filter((c) => {
      const created = c.createdAt?.toDate();
      if (!created) return false;
      return created >= start;
    });
  }, [costs, period]);

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
              <div style={{ width: 180 }}>
                <select
                  className="form-select form-select-sm"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month" | "year")}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
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
