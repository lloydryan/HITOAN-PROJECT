import { Order } from "../../../types";
import PaymentBadge from "../../../components/common/PaymentBadge";
import StatusBadge from "../../../components/common/StatusBadge";
import { currency, dtShort } from "../../../utils/format";

interface OrdersTableProps {
  orders: Order[];
  onStartRowLongPress: (order: Order) => void;
  onCancelRowLongPress: () => void;
  onAddItem: (order: Order) => void;
  onShowBill: (order: Order) => void;
  onProcessPayment: (order: Order) => void;
  onViewReceipt: (order: Order) => void;
  onMarkServed: (order: Order) => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (target as HTMLElement | null)?.closest("button, input, select, textarea, a");
}

export default function OrdersTable({
  orders,
  onStartRowLongPress,
  onCancelRowLongPress,
  onAddItem,
  onShowBill,
  onProcessPayment,
  onViewReceipt,
  onMarkServed
}: OrdersTableProps) {
  return (
    <div className="cash-orders-table-wrap">
      <table className="table table-sm app-table align-middle cash-orders-table">
        <colgroup>
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "31%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Table #</th>
            <th>Status</th>
            <th className="cash-orders-th-payment">Payment</th>
            <th className="cash-orders-th-total">Total</th>
            <th className="cash-orders-th-created">Created</th>
            <th className="cash-orders-th-action">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-muted">
                No active orders found.
              </td>
            </tr>
          ) : (
            orders.map((order) => (
            <tr
              key={order.id}
              className={`cash-orders-row ${order.paymentStatus === "unpaid" ? "cash-orders-row-unpaid" : ""}`}
              onMouseDown={(e) => {
                if (isInteractiveTarget(e.target)) return;
                onStartRowLongPress(order);
              }}
              onMouseUp={onCancelRowLongPress}
              onMouseLeave={onCancelRowLongPress}
              onTouchStart={(e) => {
                if (isInteractiveTarget(e.target)) return;
                onStartRowLongPress(order);
              }}
              onTouchEnd={onCancelRowLongPress}
              title="Long press row for admin edit/void"
            >
              <td data-label="Table #" className="cash-orders-table-cell">
                {order.type === "takeout" || order.tableNumber === "Takeout" ? (
                  <span className="cash-orders-table-badge">Takeout</span>
                ) : (
                  order.tableNumber || "-"
                )}
              </td>
              <td data-label="Status">
                <StatusBadge status={order.status} />
              </td>
              <td data-label="Payment" className="cash-orders-payment">
                <PaymentBadge status={order.paymentStatus} />
              </td>
              <td data-label="Total" className="cash-orders-total">{currency(order.total)}</td>
              <td data-label="Created" className="cash-orders-created">{dtShort(order.createdAt?.toDate())}</td>
              <td data-label="Actions" className="cash-orders-actions">
                {order.paymentStatus === "unpaid" && (
                  <button
                    className="btn btn-sm btn-outline-secondary cash-orders-btn"
                    onClick={() => onAddItem(order)}
                  >
                    Add
                  </button>
                )}
                {order.paymentStatus === "unpaid" && (
                  <button
                    className="btn btn-sm btn-outline-primary cash-orders-btn cash-orders-btn-bill"
                    data-bs-toggle="modal"
                    data-bs-target="#billModal"
                    onClick={() => onShowBill(order)}
                  >
                    Bill
                  </button>
                )}
                {order.status === "ready" && (
                  <button
                    className="btn btn-sm btn-success cash-orders-btn cash-orders-btn-served"
                    onClick={() => onMarkServed(order)}
                  >
                    Served
                  </button>
                )}
                {order.paymentStatus === "unpaid" && (
                  <button
                    className="btn btn-sm btn-primary cash-orders-btn cash-orders-btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#paymentModal"
                    onClick={() => onProcessPayment(order)}
                  >
                    Pay
                  </button>
                )}
                {order.paymentStatus === "paid" && (
                  <button
                    className="btn btn-sm btn-outline-primary cash-orders-btn cash-orders-btn-bill"
                    onClick={() => onViewReceipt(order)}
                  >
                    Receipt
                  </button>
                )}
              </td>
            </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
