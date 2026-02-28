import { OrderStatus } from "../../types";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "pending"
      ? "pending"
      : status === "preparing"
      ? "preparing"
      : status === "ready"
      ? "ready"
      : status === "served"
      ? "served"
      : "cancelled";
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`app-status-badge app-status-${tone}`}>
      <span className="app-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
