import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Order, OrderLine, VoidRequest } from "../../types";
import { currency, dt } from "../../utils/format";
import {
  getPendingVoidRequests,
  resolveVoidRequest,
} from "../../services/voidRequestService";
import {
  editOrderByAdmin,
  getOrderById,
  voidOrderByAdmin,
} from "../../services/orderService";
import { computeOrderTotals, getVatLabel } from "../../utils/orderPricing";

export default function VoidRequestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<VoidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingReq, setReviewingReq] = useState<VoidRequest | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [voidConfirmReq, setVoidConfirmReq] = useState<VoidRequest | null>(null);
  const [editDraft, setEditDraft] = useState<{
    tableNumber: string;
    type: "dine-in" | "takeout";
    items: OrderLine[];
    vatEnabled: boolean;
  } | null>(null);

  const load = async () => {
    const data = await getPendingVoidRequests();
    setRequests(data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openReview = async (req: VoidRequest) => {
    try {
      const order = await getOrderById(req.orderId);
      if (!order) {
        showToast("Not found", "Order no longer exists.", "warning");
        return;
      }
      setReviewingReq(req);
      setReviewOrder(order);
      setEditDraft({
        tableNumber: order.tableNumber || "",
        type: order.type,
        items: order.items.map((item) => ({ ...item })),
        vatEnabled: order.vatEnabled ?? true,
      });
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const closeReview = () => {
    if (adminSubmitting) return;
    setReviewingReq(null);
    setReviewOrder(null);
    setEditDraft(null);
  };

  const setEditItemQty = (index: number, nextQty: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item, idx) =>
        idx === index ? { ...item, qty: Math.max(0, Number(nextQty) || 0) } : item,
      );
      return { ...prev, items };
    });
  };

  const applyEdit = async () => {
    if (!user || !reviewOrder || !reviewingReq || !editDraft) return;
    if (!editDraft.items.some((item) => (Number(item.qty) || 0) > 0)) {
      showToast("Validation", "Order must have at least one item.", "warning");
      return;
    }

    setAdminSubmitting(true);
    try {
      await editOrderByAdmin(user, reviewOrder, {
        tableNumber: editDraft.tableNumber,
        type: editDraft.type,
        items: editDraft.items,
        vatEnabled: editDraft.vatEnabled,
      });
      await resolveVoidRequest(user, reviewingReq, "Resolved via admin edit");
      showToast("Success", `Order ${reviewOrder.orderNumber} updated.`);
      closeReview();
      await load();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const applyVoid = async () => {
    if (!user || !reviewOrder || !reviewingReq) return;
    setAdminSubmitting(true);
    try {
      await voidOrderByAdmin(user, reviewOrder);
      await resolveVoidRequest(user, reviewingReq, "Resolved via admin void");
      showToast("Success", `Order ${reviewOrder.orderNumber} voided.`);
      closeReview();
      await load();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const editSubtotal = Number(
    (
      editDraft?.items.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        return sum + item.priceSnapshot * Math.max(0, qty);
      }, 0) || 0
    ).toFixed(2),
  );
  const { tax: editTax, total: editTotal } = computeOrderTotals(
    editSubtotal,
    editDraft?.vatEnabled ?? true,
  );

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Void Requests</h5>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        <p className="text-muted small mb-3">
          Showing all unresolved requests from cashier for admin review.
        </p>

        {loading ? (
          <div className="spinner-border text-primary" />
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Order</th>
                  <th>Table</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Requested By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted text-center py-4">
                      No unresolved void requests.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id}>
                      <td>{dt(req.createdAt?.toDate())}</td>
                      <td>#{req.orderNumber}</td>
                      <td>{req.tableNumber || "-"}</td>
                      <td className="text-capitalize">{req.orderStatus}</td>
                      <td className="text-capitalize">{req.paymentStatus}</td>
                      <td>
                        <div>{req.requesterName}</div>
                        <small className="text-muted">
                          {req.requesterEmployeeId || req.requesterUid}
                        </small>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => openReview(req)}
                        >
                          Edit / Void
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewingReq && reviewOrder && editDraft ? (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content cash-orders-modal-content">
              <div className="modal-header cash-orders-modal-header">
                <h5 className="modal-title">Edit / Void Order</h5>
                <button className="btn-close" type="button" onClick={closeReview} />
              </div>
              <div className="modal-body d-grid gap-3 cash-orders-modal-body">
                <div className="small text-muted">
                  Order: <strong>{reviewOrder.orderNumber}</strong>
                </div>
                <div className="small text-success">
                  Authorized as {user?.displayName} ({user?.employeeId || user?.id})
                </div>

                <div className="border rounded p-3 d-grid gap-2 cash-orders-panel">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label">Order Type</label>
                      <select
                        className="form-select cash-orders-input"
                        value={editDraft.type}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, type: e.target.value as "dine-in" | "takeout" } : prev,
                          )
                        }
                        disabled={adminSubmitting}
                      >
                        <option value="dine-in">Dine-in</option>
                        <option value="takeout">Takeout</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Table Number</label>
                      <input
                        className="form-control cash-orders-input"
                        value={editDraft.tableNumber}
                        onChange={(e) =>
                          setEditDraft((prev) => (prev ? { ...prev, tableNumber: e.target.value } : prev))
                        }
                        disabled={adminSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-check">
                    <input
                      id="adminVoidReqVatEnabled"
                      className="form-check-input"
                      type="checkbox"
                      checked={editDraft.vatEnabled}
                      onChange={(e) =>
                        setEditDraft((prev) => (prev ? { ...prev, vatEnabled: e.target.checked } : prev))
                      }
                      disabled={adminSubmitting}
                    />
                    <label className="form-check-label" htmlFor="adminVoidReqVatEnabled">
                      Add VAT (12%)
                    </label>
                  </div>

                  <div className="table-responsive cash-orders-table-wrap">
                    <table className="table table-sm align-middle mb-1 cash-orders-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Price</th>
                          <th style={{ width: 140 }}>Qty</th>
                          <th className="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editDraft.items.map((item, idx) => (
                          <tr key={`${item.menuItemId}-${idx}`}>
                            <td>{item.nameSnapshot}</td>
                            <td>{currency(item.priceSnapshot)}</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                className="form-control form-control-sm cash-orders-input"
                                value={item.qty}
                                onChange={(e) => setEditItemQty(idx, Number(e.target.value))}
                                disabled={adminSubmitting}
                              />
                            </td>
                            <td className="text-end">
                              {currency(item.priceSnapshot * Math.max(0, Number(item.qty) || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="small d-grid gap-1 border rounded p-2 bg-light cash-orders-totals-card">
                    <div className="d-flex justify-content-between">
                      <span>Subtotal</span>
                      <strong>{currency(editSubtotal)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>{getVatLabel(editDraft.vatEnabled)}</span>
                      <strong>{currency(editTax)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Total</span>
                      <strong>{currency(editTotal)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer cash-orders-modal-footer">
                <button className="btn btn-secondary cash-orders-btn" type="button" onClick={closeReview} disabled={adminSubmitting}>
                  Close
                </button>
                <button
                  className="btn btn-outline-danger cash-orders-btn"
                  type="button"
                  onClick={() => setVoidConfirmReq(reviewingReq)}
                  disabled={adminSubmitting || reviewOrder.paymentStatus === "paid"}
                >
                  {adminSubmitting ? "Please wait..." : "Void Order"}
                </button>
                <button
                  className="btn btn-primary cash-orders-btn cash-orders-btn-primary"
                  type="button"
                  onClick={applyEdit}
                  disabled={adminSubmitting}
                >
                  {adminSubmitting ? "Saving..." : "Save Edit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {voidConfirmReq ? (
        <div className="logout-modal-root" role="dialog" aria-modal="true">
          <div className="logout-modal-backdrop" />
          <div className="logout-modal-wrap">
            <div className="logout-modal-content">
              <div className="logout-modal-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
              <h5 className="logout-modal-title">Confirm Void</h5>
              <p className="logout-modal-text">
                Void order <strong>{voidConfirmReq.orderNumber}</strong>?
              </p>
              <div className="logout-modal-actions">
                <button
                  type="button"
                  className="logout-modal-btn logout-modal-btn-cancel"
                  onClick={() => setVoidConfirmReq(null)}
                  disabled={adminSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="logout-modal-btn logout-modal-btn-confirm"
                  onClick={async () => {
                    await applyVoid();
                    setVoidConfirmReq(null);
                  }}
                  disabled={adminSubmitting}
                >
                  {adminSubmitting ? "Voiding..." : "Void Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
