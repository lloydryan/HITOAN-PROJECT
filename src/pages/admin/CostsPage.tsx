import { useEffect, useState } from "react";
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
            <h5>Cost Records</h5>
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
                    {costs.map((c) => (
                      <tr key={c.id}>
                        <td>{c.type}</td>
                        <td>{currency(c.value)}</td>
                        <td>{c.note || "-"}</td>
                        <td>{dt(c.createdAt?.toDate())}</td>
                      </tr>
                    ))}
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
