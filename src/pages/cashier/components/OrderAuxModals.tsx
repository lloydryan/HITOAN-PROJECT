import { AppUser, DiscountType, Order, OrderLine } from "../../../types";
import { currency, currencyReceipt, dt } from "../../../utils/format";

interface ReceiptData {
  order: Order;
  method: "cash" | "gcash" | "qr";
  discountType: DiscountType;
  discountRate: number;
  totalPersons?: number;
  discountedPersons?: number;
  sharePerPerson?: number;
  discountAmount: number;
  amountDue: number;
  amountPaid: number;
  change: number;
  transferLast4?: string;
  paidAt: string;
}

interface AdminAuthModalProps {
  orderNumber?: string;
  adminIdInput: string;
  validatingAdmin: boolean;
  adminSubmitting: boolean;
  onAdminIdChange: (value: string) => void;
  onValidate: () => void;
}

export function AdminAuthModal({
  orderNumber,
  adminIdInput,
  validatingAdmin,
  adminSubmitting,
  onAdminIdChange,
  onValidate
}: AdminAuthModalProps) {
  return (
    <div className="modal fade cash-orders-modal" id="adminAuthModal" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content cash-orders-modal-content">
          <div className="modal-header cash-orders-modal-header">
            <h5 className="modal-title">Admin Authorization</h5>
            <button className="btn-close" type="button" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body d-grid gap-3 cash-orders-modal-body">
            <div className="small text-muted">
              Long-pressed order: <strong>{orderNumber || "-"}</strong>
            </div>

            <div className="border rounded p-3 cash-orders-panel">
              <label className="form-label">Admin Employee ID</label>
              <div className="d-flex gap-2">
                <input
                  type="password"
                  className="form-control cash-orders-input"
                  placeholder="Enter admin employee ID"
                  value={adminIdInput}
                  onChange={(e) => onAdminIdChange(e.target.value)}
                  disabled={adminSubmitting}
                />
                <button
                  type="button"
                  className="btn btn-primary cash-orders-btn cash-orders-btn-primary"
                  onClick={onValidate}
                  disabled={validatingAdmin || adminSubmitting}
                >
                  {validatingAdmin ? "Checking..." : "Authorize"}
                </button>
              </div>
              <div className="small text-muted mt-2">Enter admin ID to continue to edit/void screen.</div>
            </div>
          </div>
          <div className="modal-footer cash-orders-modal-footer">
            <button className="btn btn-secondary cash-orders-btn" type="button" data-bs-dismiss="modal" disabled={validatingAdmin}>
              Close
            </button>
            <button className="btn btn-primary cash-orders-btn cash-orders-btn-primary" type="button" onClick={onValidate} disabled={validatingAdmin}>
              {validatingAdmin ? "Checking..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminOrderActionModalProps {
  orderNumber?: string;
  authorizedAdmin: AppUser | null;
  editDraft: { tableNumber: string; type: "dine-in" | "takeout"; items: OrderLine[] } | null;
  editSubtotal: number;
  editTax: number;
  editTotal: number;
  adminSubmitting: boolean;
  paymentStatus?: Order["paymentStatus"];
  onTypeChange: (value: "dine-in" | "takeout") => void;
  onTableChange: (value: string) => void;
  onItemQtyChange: (index: number, value: number) => void;
  onVoid: () => void;
  onSave: () => void;
}

export function AdminOrderActionModal({
  orderNumber,
  authorizedAdmin,
  editDraft,
  editSubtotal,
  editTax,
  editTotal,
  adminSubmitting,
  paymentStatus,
  onTypeChange,
  onTableChange,
  onItemQtyChange,
  onVoid,
  onSave
}: AdminOrderActionModalProps) {
  return (
    <div className="modal fade cash-orders-modal" id="orderAdminActionModal" tabIndex={-1}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content cash-orders-modal-content">
          <div className="modal-header cash-orders-modal-header">
            <h5 className="modal-title">Edit / Void Order</h5>
            <button className="btn-close" type="button" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body d-grid gap-3 cash-orders-modal-body">
            <div className="small text-muted">
              Order: <strong>{orderNumber || "-"}</strong>
            </div>
            {authorizedAdmin ? (
              <div className="small text-success">
                Authorized as {authorizedAdmin.displayName} ({authorizedAdmin.employeeId || "no employee ID"})
              </div>
            ) : null}

            <div className="border rounded p-3 d-grid gap-2 cash-orders-panel">
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">Order Type</label>
                  <select
                    className="form-select cash-orders-input"
                    value={editDraft?.type || "dine-in"}
                    onChange={(e) => onTypeChange(e.target.value as "dine-in" | "takeout")}
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
                    value={editDraft?.tableNumber || ""}
                    onChange={(e) => onTableChange(e.target.value)}
                    disabled={adminSubmitting}
                  />
                </div>
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
                    {editDraft?.items.map((item, idx) => (
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
                            onChange={(e) => onItemQtyChange(idx, Number(e.target.value))}
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
                  <span>Tax (12%)</span>
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
            <button className="btn btn-secondary cash-orders-btn" type="button" data-bs-dismiss="modal" disabled={adminSubmitting}>
              Close
            </button>
            <button
              className="btn btn-outline-danger cash-orders-btn"
              type="button"
              onClick={onVoid}
              disabled={!authorizedAdmin || adminSubmitting || paymentStatus === "paid"}
            >
              {adminSubmitting ? "Please wait..." : "Void Order"}
            </button>
            <button className="btn btn-primary cash-orders-btn cash-orders-btn-primary" type="button" onClick={onSave} disabled={!authorizedAdmin || adminSubmitting}>
              {adminSubmitting ? "Saving..." : "Save Edit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BillModalProps {
  billOrder: Order | null;
  onPrint: () => void;
}

export function BillModal({ billOrder, onPrint }: BillModalProps) {
  const billSubtotal = billOrder
    ? Number(
        billOrder.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
      )
    : 0;
  const billTax = billOrder
    ? Number((billOrder.total - billSubtotal).toFixed(2))
    : 0;

  return (
    <div className="modal fade cash-orders-modal" id="billModal" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content cash-orders-modal-content">
          <div className="modal-header cash-orders-modal-header">
            <h5 className="modal-title">Bill</h5>
            <button className="btn-close" type="button" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body cash-orders-modal-body">
            {billOrder ? (
              <div className="small">
                <div>
                  <strong>Company:</strong> HITOAN Restaurant
                </div>
                <hr />
                <div>
                  <strong>Order:</strong> {billOrder.orderNumber}
                </div>
                <div>
                  <strong>Table:</strong> {billOrder.tableNumber || "-"}
                </div>
                {billOrder.orderNotes && (
                  <div>
                    <strong>Order Notes:</strong> {billOrder.orderNotes}
                  </div>
                )}
                <div>
                  <strong>Created:</strong> {dt(billOrder.createdAt?.toDate())}
                </div>
                <div>
                  <strong>Total Qty:</strong> {billOrder.items.reduce((sum, i) => sum + i.qty, 0)}
                </div>
                <hr />
                {billOrder.items.map((item, idx) => (
                  <div key={`${billOrder.id}-${idx}`} className="d-flex justify-content-between">
                    <span>
                      {item.nameSnapshot} x{item.qty}
                    </span>
                    <span>{currency(item.subtotal)}</span>
                  </div>
                ))}
                <hr />
                <div className="d-flex justify-content-between">
                  <span>Subtotal</span>
                  <strong>{currency(billSubtotal)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Tax (12%)</span>
                  <strong>{currency(billTax)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Total</span>
                  <strong>{currency(billOrder.total)}</strong>
                </div>
              </div>
            ) : null}
          </div>
          <div className="modal-footer cash-orders-modal-footer">
            <button className="btn btn-secondary cash-orders-btn" type="button" data-bs-dismiss="modal">
              Close
            </button>
            <button className="btn btn-primary cash-orders-btn cash-orders-btn-primary" type="button" onClick={onPrint}>
              Print Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onPrint: () => void;
}

function formatReceiptDate(d: Date | undefined) {
  if (!d) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ReceiptModal({ receipt, onPrint }: ReceiptModalProps) {
  const receiptSubtotal = receipt
    ? Number(
        receipt.order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
      )
    : 0;
  const receiptTax = receipt
    ? Number((receipt.order.total - receiptSubtotal).toFixed(2))
    : 0;

  return (
    <div className="modal fade cash-orders-modal" id="receiptModal" tabIndex={-1}>
      <div className="modal-dialog pos-receipt-modal-dialog">
        <div className="modal-content cash-orders-modal-content">
          <div className="modal-header cash-orders-modal-header">
            <h5 className="modal-title">Receipt</h5>
            <button className="btn-close" type="button" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body pos-receipt-body">
            {receipt ? (
              <div className="pos-receipt">
                <div className="pos-receipt-header">
                  <div className="pos-receipt-brand">HITOAN RESTAURANT</div>
                  <div className="pos-receipt-order">Order #{receipt.order.orderNumber}</div>
                  <div className="pos-receipt-meta">
                    Table {receipt.order.tableNumber || "-"} · {formatReceiptDate(receipt.order.createdAt?.toDate())}
                  </div>
                </div>

                <div className="pos-receipt-section">
                  <div className="pos-receipt-row">
                    <span>Official Receipt</span>
                  </div>
                  <div className="pos-receipt-row">
                    <span>Created</span>
                    <span>{dt(receipt.order.createdAt?.toDate())}</span>
                  </div>
                  <div className="pos-receipt-row">
                    <span>Paid</span>
                    <span>{dt(new Date(receipt.paidAt))}</span>
                  </div>
                  <div className="pos-receipt-row">
                    <span>Method</span>
                    <span>{receipt.method.toUpperCase()}</span>
                  </div>
                  <div className="pos-receipt-row">
                    <span>Discount</span>
                    <span>{receipt.discountType === "none" ? "None" : receipt.discountType.toUpperCase()}{receipt.discountRate > 0 ? ` (${Math.round(receipt.discountRate * 100)}%)` : ""}</span>
                  </div>
                  {receipt.discountType !== "none" && (
                    <div className="pos-receipt-row">
                      <span>Discounted Persons</span>
                      <span>{receipt.discountedPersons || 0}/{receipt.totalPersons || 1}</span>
                    </div>
                  )}
                  {receipt.method !== "cash" && receipt.transferLast4 && (
                    <div className="pos-receipt-row">
                      <span>Ref Last 4</span>
                      <span>{receipt.transferLast4}</span>
                    </div>
                  )}
                </div>

                <div className="pos-receipt-section pos-receipt-items">
                  {receipt.order.items.map((item, idx) => (
                    <div key={`${receipt.order.id}-${idx}`} className="pos-receipt-row pos-receipt-item-row">
                      <span>{item.nameSnapshot} x{item.qty}</span>
                      <span className="pos-receipt-amount">{currencyReceipt(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="pos-receipt-section pos-receipt-totals">
                  <div className="pos-receipt-row">
                    <span>Subtotal</span>
                    <strong className="pos-receipt-amount">{currencyReceipt(receiptSubtotal)}</strong>
                  </div>
                  <div className="pos-receipt-row">
                    <span>Tax (12%)</span>
                    <strong className="pos-receipt-amount">{currencyReceipt(receiptTax)}</strong>
                  </div>
                  <div className="pos-receipt-row pos-receipt-row-total">
                    <span>Total</span>
                    <strong className="pos-receipt-amount">{currencyReceipt(receipt.order.total)}</strong>
                  </div>
                  {receipt.discountAmount > 0 && (
                    <div className="pos-receipt-row">
                      <span>
                        Discount
                        {receipt.discountType !== "none" && (
                          <> ({receipt.discountType === "pwd" ? "PWD" : receipt.discountType === "senior" ? "Senior" : receipt.discountType}
                          {receipt.discountRate > 0 ? ` ${Math.round(receipt.discountRate * 100)}%` : ""})</>
                        )}
                      </span>
                      <strong className="pos-receipt-amount">- {currencyReceipt(receipt.discountAmount)}</strong>
                    </div>
                  )}
                  <div className="pos-receipt-row pos-receipt-row-final">
                    <span>Amount Due</span>
                    <strong className="pos-receipt-amount">{currencyReceipt(receipt.amountDue)}</strong>
                  </div>
                  <div className="pos-receipt-row">
                    <span>Amount Paid</span>
                    <strong className="pos-receipt-amount">{currencyReceipt(receipt.amountPaid)}</strong>
                  </div>
                  {receipt.method === "cash" && (
                    <div className="pos-receipt-row pos-receipt-row-change">
                      <span>Change</span>
                      <strong className="pos-receipt-amount">{currencyReceipt(receipt.change)}</strong>
                    </div>
                  )}
                </div>

                <div className="pos-receipt-footer">
                  Thank you for dining!
                  <br />
                  Please come again.
                </div>
              </div>
            ) : null}
          </div>
          <div className="modal-footer cash-orders-modal-footer">
            <button className="btn btn-secondary cash-orders-btn" type="button" data-bs-dismiss="modal">
              Close
            </button>
            <button className="btn btn-primary cash-orders-btn cash-orders-btn-primary" type="button" onClick={onPrint}>
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
