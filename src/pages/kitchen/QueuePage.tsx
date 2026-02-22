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
      <div className="card">
        <div className="card-body">
          <h5>Kitchen Queue</h5>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Order #</th><th>Table #</th><th>Items</th><th>Status</th><th>Created</th><th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer"
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
                          className="btn btn-sm btn-primary"
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedOrder ? (
        <>
          <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Order Details - {selectedOrder.orderNumber} (Table {selectedOrder.tableNumber || "-"})
                  </h5>
                  <button type="button" className="btn-close" onClick={closeDetails} />
                </div>
                <div className="modal-body">
                  <div className="mb-2 small text-muted">
                    Mark each item as reviewed before moving to{" "}
                    <strong>{nextStatus(selectedOrder.status) || "next status"}</strong>.
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
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
                            style={{ cursor: "pointer" }}
                            onClick={() => toggleItemChecked(selectedOrder, idx)}
                          >
                            <td>
                              <input
                                className="form-check-input"
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
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" onClick={closeDetails}>
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
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
