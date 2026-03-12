import { useEffect, useMemo, useState } from "react";
import { Order } from "../../types";
import { subscribeKitchenQueue, updateOrderStatus } from "../../services/orderService";
import { useAuth } from "../../hooks/useAuth";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { dt } from "../../utils/format";

const KITCHEN_CHECKS_KEY = "kitchen_order_item_checks_v1";

type CheckedState = Record<string, Record<string, boolean>>;

export default function QueuePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checkedState, setCheckedState] = useState<CheckedState>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeKitchenQueue(setOrders);
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KITCHEN_CHECKS_KEY);
      if (raw) setCheckedState(JSON.parse(raw) as CheckedState);
    } catch {
      setCheckedState({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KITCHEN_CHECKS_KEY, JSON.stringify(checkedState));
  }, [checkedState]);

  const nextStatus = (status: Order["status"]) => {
    if (status === "pending") return "preparing";
    if (status === "preparing") return "ready";
    return null;
  };

  const getItemKey = (order: Order, index: number) => `${order.id}:${index}`;

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const closeDetails = () => {
    setSelectedOrder(null);
  };

  const setItemChecked = (order: Order, index: number, checked: boolean) => {
    const key = getItemKey(order, index);
    setCheckedState((prev) => ({
      ...prev,
      [order.id]: {
        ...(prev[order.id] || {}),
        [key]: checked
      }
    }));
  };

  const isItemChecked = (order: Order, index: number) => {
    const key = getItemKey(order, index);
    return !!checkedState[order.id]?.[key];
  };

  const toggleItemChecked = (order: Order, index: number) => {
    setItemChecked(order, index, !isItemChecked(order, index));
  };

  const allCheckedForSelected = useMemo(() => {
    if (!selectedOrder) return false;
    if (selectedOrder.items.length === 0) return false;
    return selectedOrder.items.every((_, idx) => isItemChecked(selectedOrder, idx));
  }, [selectedOrder, checkedState]);

  const truncateItems = (order: Order) => {
    const full = order.items.map((i) => `${i.nameSnapshot} x${i.qty}`).join(", ");
    if (full.length <= 42) return full;
    return `${full.slice(0, 42)}...`;
  };

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders],
  );
  const preparingCount = useMemo(
    () => orders.filter((o) => o.status === "preparing").length,
    [orders],
  );
  const readyCount = useMemo(
    () => orders.filter((o) => o.status === "ready").length,
    [orders],
  );

  const move = async () => {
    if (!selectedOrder) return;
    if (!user) return;
    const ns = nextStatus(selectedOrder.status);
    if (!ns) return;
    if (!allCheckedForSelected) {
      showToast("Checklist required", "Check all items before moving this order.", "warning");
      return;
    }

    try {
      setSaving(true);
      await updateOrderStatus(user, selectedOrder.id, ns);
      showToast("Updated", `Order moved to ${ns}`);

      // Clear checks when order progresses.
      setCheckedState((prev) => {
        const next = { ...prev };
        delete next[selectedOrder.id];
        return next;
      });
      closeDetails();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="card kitchen-queue-card">
        <div className="card-body">
          <div className="kitchen-queue-header">
            <div>
              <h5 className="mb-1 kitchen-queue-title">Kitchen Queue</h5>
              <p className="mb-0 kitchen-queue-subtitle">
                Review item checklists, then move each order to the next status.
              </p>
            </div>
            <div className="kitchen-queue-kpis">
              <span className="kitchen-queue-kpi">
                Pending <strong>{pendingCount}</strong>
              </span>
              <span className="kitchen-queue-kpi">
                Preparing <strong>{preparingCount}</strong>
              </span>
              <span className="kitchen-queue-kpi">
                Ready <strong>{readyCount}</strong>
              </span>
            </div>
          </div>

          <div className="table-responsive kitchen-queue-table-wrap">
            <table className="table table-hover kitchen-queue-table">
              <thead>
                <tr>
                  <th>Order #</th><th>Table #</th><th>Items</th><th>Status</th><th>Created</th><th />
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No kitchen queue orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="kitchen-queue-row"
                      onClick={() => openDetails(o)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{o.orderNumber}</td>
                      <td>{o.tableNumber || "-"}</td>
                      <td title={o.items.map((i) => `${i.nameSnapshot} x${i.qty}`).join(", ")}>
                        {truncateItems(o)}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>{dt(o.createdAt?.toDate())}</td>
                      <td className="text-end">
                        {nextStatus(o.status) ? (
                          <button
                            className="btn btn-sm btn-primary kitchen-queue-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(o);
                            }}
                          >
                            Review & Move
                          </button>
                        ) : (
                          <span className="text-muted small">No action</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedOrder ? (
        <>
          <div className="modal d-block kitchen-queue-modal" tabIndex={-1} style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content kitchen-queue-modal-content">
                <div className="modal-header kitchen-queue-modal-header">
                  <h5 className="modal-title">
                    Order Details - {selectedOrder.orderNumber} (Table {selectedOrder.tableNumber || "-"})
                  </h5>
                  <button type="button" className="btn-close" onClick={closeDetails} />
                </div>
                <div className="modal-body kitchen-queue-modal-body">
                  {selectedOrder.orderNotes && (
                    <div className="kitchen-queue-notes mb-3">
                      <strong>Order Notes:</strong> {selectedOrder.orderNotes}
                    </div>
                  )}
                  <div className="mb-2 small text-muted">
                    Mark each item as reviewed before moving to{" "}
                    <strong>{nextStatus(selectedOrder.status) || "next status"}</strong>.
                  </div>
                  <div className="table-responsive kitchen-queue-table-wrap">
                    <table className="table table-sm align-middle kitchen-queue-check-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Check</th>
                          <th>Item</th>
                          <th style={{ width: 120 }}>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, idx) => (
                          <tr
                            key={`${selectedOrder.id}-${idx}`}
                            className={isItemChecked(selectedOrder, idx) ? "kitchen-queue-check-row-checked" : ""}
                            style={{ cursor: "pointer" }}
                            onClick={() => toggleItemChecked(selectedOrder, idx)}
                          >
                            <td>
                              <input
                                className="form-check-input kitchen-queue-check-input"
                                type="checkbox"
                                checked={isItemChecked(selectedOrder, idx)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setItemChecked(selectedOrder, idx, e.target.checked)}
                              />
                            </td>
                            <td>{item.nameSnapshot}</td>
                            <td>{item.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer kitchen-queue-modal-footer">
                  <button className="btn btn-outline-secondary kitchen-queue-btn-secondary" onClick={closeDetails}>
                    Close
                  </button>
                  <button
                    className="btn btn-primary kitchen-queue-btn"
                    disabled={!nextStatus(selectedOrder.status) || !allCheckedForSelected || saving}
                    onClick={move}
                  >
                    {saving
                      ? "Updating..."
                      : `Move to ${nextStatus(selectedOrder.status) || "next"}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      ) : null}
    </>
  );
}
