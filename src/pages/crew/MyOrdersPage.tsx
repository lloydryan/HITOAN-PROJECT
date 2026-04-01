import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getOrdersForCrew } from "../../services/orderService";
import { Order } from "../../types";
import StatusBadge from "../../components/common/StatusBadge";
import PaymentBadge from "../../components/common/PaymentBadge";
import { currency, dt } from "../../utils/format";
import { getVatLabel } from "../../utils/orderPricing";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
          <table className="table table-sm app-table">
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
                  <tr
                    key={o.id}
                    className="crew-orders-row"
                    onClick={() => setSelectedOrder(o)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedOrder(o)}
                  >
                    <td>{o.orderNumber}</td>
                    <td>{o.crewName || "-"}</td>
                    <td>{o.crewEmployeeId || "-"}</td>
                    <td>{o.type === "takeout" ? "Takeout" : "Dine-in"}</td>
                    <td>{o.type === "dine-in" ? (o.tableNumber || "-") : "-"}</td>
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

        {selectedOrder && (
          <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Order #{selectedOrder.orderNumber}</h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-4">Crew</dt>
                    <dd className="col-sm-8">
                      {selectedOrder.crewName || "-"}
                      {selectedOrder.crewEmployeeId ? ` #${selectedOrder.crewEmployeeId}` : ""}
                    </dd>
                    <dt className="col-sm-4">Type</dt>
                    <dd className="col-sm-8">
                      {selectedOrder.type === "takeout" ? "Takeout" : "Dine-in"}
                    </dd>
                    {selectedOrder.type === "dine-in" && (
                      <>
                        <dt className="col-sm-4">Table #</dt>
                        <dd className="col-sm-8">{selectedOrder.tableNumber || "-"}</dd>
                      </>
                    )}
                    <dt className="col-sm-4">Status</dt>
                    <dd className="col-sm-8"><StatusBadge status={selectedOrder.status} /></dd>
                    <dt className="col-sm-4">Payment</dt>
                    <dd className="col-sm-8"><PaymentBadge status={selectedOrder.paymentStatus} /></dd>
                    <dt className="col-sm-4">Created</dt>
                    <dd className="col-sm-8">{dt(selectedOrder.createdAt?.toDate())}</dd>
                  </dl>
                  <h6 className="mt-3 mb-2">Items</h6>
                  <ul className="list-unstyled mb-0">
                    {selectedOrder.items?.map((item, idx) => (
                      <li key={idx} className="d-flex justify-content-between py-1">
                        <span>{item.nameSnapshot} × {item.qty}</span>
                        <span>{currency(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <hr />
                  <div className="d-flex justify-content-between">
                    <span>Subtotal</span><strong>{currency(selectedOrder.subtotal)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>{getVatLabel(selectedOrder.vatEnabled ?? true)}</span><strong>{currency(selectedOrder.tax)}</strong>
                  </div>
                  <div className="d-flex justify-content-between crew-order-total-line">
                    <span>TOTAL</span><strong>{currency(selectedOrder.total)}</strong>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
