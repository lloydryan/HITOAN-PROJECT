import { PaymentStatus } from "../../types";

export default function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`badge ${status === "paid" ? "bg-success" : "bg-danger"}`}>{status}</span>;
}
