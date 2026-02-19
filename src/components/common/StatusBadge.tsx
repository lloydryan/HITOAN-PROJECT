import { OrderStatus } from "../../types";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const cls =
    status === "pending"
      ? "bg-secondary"
      : status === "preparing"
      ? "bg-warning text-dark"
      : status === "ready"
      ? "bg-info text-dark"
      : status === "served"
      ? "bg-success"
      : "bg-danger";
  return <span className={`badge ${cls}`}>{status}</span>;
}
