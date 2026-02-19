import { useEffect, useState } from "react";
import { Order } from "../../types";
import { subscribeKitchenQueue, updateOrderStatus } from "../../services/orderService";
import { useAuth } from "../../hooks/useAuth";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { dt } from "../../utils/format";

export default function QueuePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsub = subscribeKitchenQueue(setOrders);
    return () => unsub();
  }, []);

  const nextStatus = (status: Order["status"]) => {
    if (status === "pending") return "preparing";
    if (status === "preparing") return "ready";
    return null;
  };

  const move = async (order: Order) => {
    if (!user) return;
    const ns = nextStatus(order.status);
    if (!ns) return;
    try {
      await updateOrderStatus(user, order.id, ns);
      showToast("Updated", `Order moved to ${ns}`);
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h5>Kitchen Queue</h5>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Order #</th><th>Items</th><th>Status</th><th>Created</th><th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNumber}</td>
                  <td>{o.items.map((i) => `${i.nameSnapshot} x${i.qty}`).join(", ")}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{dt(o.createdAt?.toDate())}</td>
                  <td className="text-end">
                    {nextStatus(o.status) ? (
                      <button className="btn btn-sm btn-primary" onClick={() => move(o)}>
                        Move to {nextStatus(o.status)}
                      </button>
                    ) : (
                      <span className="text-muted small">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
