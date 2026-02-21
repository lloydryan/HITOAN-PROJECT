import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getOrdersForCrew } from "../../services/orderService";
import { Order } from "../../types";
import StatusBadge from "../../components/common/StatusBadge";
import PaymentBadge from "../../components/common/PaymentBadge";
import { currency, dt } from "../../utils/format";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getOrdersForCrew(user.id)
      .then(setOrders)
      .catch((e) => showToast("Load failed", (e as Error).message, "danger"))
      .finally(() => setLoading(false));
  }, [user, showToast]);

  if (loading) return <div className="spinner-border text-primary" />;

  return (
    <div className="card">
      <div className="card-body">
        <h5>Orders</h5>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Order #</th><th>Crew</th><th>Employee ID</th><th>Type</th><th>Table #</th><th>Status</th><th>Payment</th><th>Total</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No orders found yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td>{o.crewName || "-"}</td>
                    <td>{o.crewEmployeeId || "-"}</td>
                    <td>{o.type}</td>
                    <td>{o.tableNumber || "-"}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><PaymentBadge status={o.paymentStatus} /></td>
                    <td>{currency(o.total)}</td>
                    <td>{dt(o.createdAt?.toDate())}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
