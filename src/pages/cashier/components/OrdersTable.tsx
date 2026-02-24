import { Order } from "../../../types";
import PaymentBadge from "../../../components/common/PaymentBadge";
import StatusBadge from "../../../components/common/StatusBadge";
import { currency, dt } from "../../../utils/format";

interface OrdersTableProps {
  orders: Order[];
  onStartRowLongPress: (order: Order) => void;
  onCancelRowLongPress: () => void;
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
  onShowBill,
  onProcessPayment,
  onViewReceipt,
  onMarkServed
}: OrdersTableProps) {
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Table #</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
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
              <td>{order.orderNumber}</td>
              <td>{order.tableNumber || "-"}</td>
              <td>
                <StatusBadge status={order.status} />
              </td>
              <td>
                <PaymentBadge status={order.paymentStatus} />
              </td>
              <td>{currency(order.total)}</td>
              <td>{dt(order.createdAt?.toDate())}</td>
              <td className="text-end">
                {order.paymentStatus === "unpaid" && (
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    data-bs-toggle="modal"
                    data-bs-target="#billModal"
                    onClick={() => onShowBill(order)}
                  >
                    Show Bill
                  </button>
                )}
                {order.paymentStatus === "unpaid" && (
                  <button
                    className="btn btn-sm btn-primary me-2"
                    data-bs-toggle="modal"
                    data-bs-target="#paymentModal"
                    onClick={() => onProcessPayment(order)}
                  >
                    Process Payment
                  </button>
                )}
                {order.paymentStatus === "paid" && (
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={() => onViewReceipt(order)}>
                    View Receipt
                  </button>
                )}
                {order.status === "ready" && (
                  <button className="btn btn-sm btn-success" onClick={() => onMarkServed(order)}>
                    Mark Served
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
