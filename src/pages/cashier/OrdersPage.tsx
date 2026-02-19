import { useEffect, useMemo, useState } from "react";
import { Order } from "../../types";
import { getAllOrders, updateOrderStatus } from "../../services/orderService";
import { processPayment } from "../../services/paymentService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import StatusBadge from "../../components/common/StatusBadge";
import PaymentBadge from "../../components/common/PaymentBadge";
import { currency, dt } from "../../utils/format";
import { useForm } from "react-hook-form";
import { PaymentSchema, paymentSchema } from "../../schemas/paymentSchema";
import { zodResolver } from "@hookform/resolvers/zod";

export default function CashierOrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => getAllOrders().then(setOrders).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => orders.filter((o) => o.status !== "cancelled"), [orders]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PaymentSchema>({ resolver: zodResolver(paymentSchema), defaultValues: { amountPaid: 0, method: "cash" } });

  const openPayment = (order: Order) => {
    setSelected(order);
    reset({ amountPaid: order.total, method: "cash" });
  };

  const submitPayment = async (values: PaymentSchema) => {
    if (!user || !selected) return;
    try {
      await processPayment(user, selected.id, values.amountPaid, values.method);
      showToast("Success", "Payment processed");
      await load();
      const modal = document.getElementById("paymentModal");
      if (modal) (window as any).bootstrap.Modal.getInstance(modal)?.hide();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const serve = async (order: Order) => {
    if (!user) return;
    try {
      await updateOrderStatus(user, order.id, "served");
      showToast("Success", "Order marked as served");
      await load();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h5>Cashier Orders</h5>

        {loading ? (
          <div className="spinner-border text-primary" />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Order #</th><th>Status</th><th>Payment</th><th>Total</th><th>Created</th><th />
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><PaymentBadge status={o.paymentStatus} /></td>
                    <td>{currency(o.total)}</td>
                    <td>{dt(o.createdAt?.toDate())}</td>
                    <td className="text-end">
                      {o.paymentStatus === "unpaid" && (
                        <button
                          className="btn btn-sm btn-primary me-2"
                          data-bs-toggle="modal"
                          data-bs-target="#paymentModal"
                          onClick={() => openPayment(o)}
                        >
                          Process Payment
                        </button>
                      )}
                      {o.paymentStatus === "paid" && o.status === "ready" && (
                        <button className="btn btn-sm btn-success" onClick={() => serve(o)}>
                          Mark Served
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal fade" id="paymentModal" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit(submitPayment)}>
                <div className="modal-header">
                  <h5 className="modal-title">Process Payment</h5>
                  <button className="btn-close" type="button" data-bs-dismiss="modal" />
                </div>
                <div className="modal-body d-grid gap-2">
                  <p className="mb-0">Order: <strong>{selected?.orderNumber}</strong></p>
                  <p className="mb-1">Total: <strong>{currency(selected?.total ?? 0)}</strong></p>
                  <div>
                    <label className="form-label">Amount Paid</label>
                    <input className="form-control" type="number" step="0.01" {...register("amountPaid")} />
                    <small className="text-danger">{errors.amountPaid?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Method</label>
                    <select className="form-select" {...register("method")}>
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Close</button>
                  <button className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
