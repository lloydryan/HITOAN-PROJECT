import { PaymentStatus } from "../../types";

export default function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone = status === "paid" ? "paid" : "unpaid";
  const label = status === "paid" ? "Paid" : "Unpaid";

  return (
    <span className={`app-status-badge app-payment-${tone}`}>
      <span className="app-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
