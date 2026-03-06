import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { PaymentSchema } from "../../../schemas/paymentSchema";
import { currency } from "../../../utils/format";
import { Order } from "../../../types";

interface PaymentModalProps {
  selectedOrder: Order | null;
  selectedMethod: PaymentSchema["method"] | undefined;
  selectedDiscountType: PaymentSchema["discountType"] | undefined;
  selectedOrderTotal: number;
  selectedDiscountAmount: number;
  selectedAmountDue: number;
  selectedTotalPersons: number;
  selectedDiscountedPersons: number;
  selectedSharePerPerson: number;
  errors: FieldErrors<PaymentSchema>;
  isSubmitting: boolean;
  canConfirmPayment: boolean;
  register: UseFormRegister<PaymentSchema>;
  setValue: UseFormSetValue<PaymentSchema>;
  onSubmit: (e?: any) => unknown;
}

export default function PaymentModal({
  selectedOrder,
  selectedMethod,
  selectedDiscountType,
  selectedOrderTotal,
  selectedDiscountAmount,
  selectedAmountDue,
  selectedTotalPersons,
  selectedDiscountedPersons,
  selectedSharePerPerson,
  errors,
  isSubmitting,
  canConfirmPayment,
  register,
  setValue,
  onSubmit,
}: PaymentModalProps) {
  return (
    <div className="modal fade cash-orders-modal" id="paymentModal" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content cash-orders-modal-content">
          <form onSubmit={onSubmit} className="cash-payment-form">
            <input type="hidden" {...register("discountType")} />
            <input type="hidden" {...register("method")} />
            <div className="modal-header cash-orders-modal-header">
              <div>
                <h5 className="modal-title mb-0">Process Payment</h5>
                <small className="cash-payment-modal-subtitle">
                  Complete method, discount, and payment details.
                </small>
              </div>
              <button className="btn-close" type="button" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body d-grid gap-3 cash-orders-modal-body">
              <div className="cash-payment-headline">
                <p className="mb-0">
                  Order: <strong>{selectedOrder?.orderNumber}</strong>
                </p>
                <p className="mb-0">
                  Total: <strong>{currency(selectedOrderTotal)}</strong>
                </p>
              </div>

              <div className="cash-payment-grid">
                <div className="cash-payment-card">
                  <label className="form-label cash-payment-card-label">Discount</label>
                  <div className="cash-payment-option-grid">
                    <button
                      type="button"
                      className={`cash-payment-option ${selectedDiscountType === "none" ? "active" : ""}`}
                      onClick={() =>
                        setValue("discountType", "none", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="cash-payment-option-title">No Discount</span>
                      <span className="cash-payment-option-sub">0%</span>
                    </button>
                    <button
                      type="button"
                      className={`cash-payment-option ${selectedDiscountType === "pwd" ? "active" : ""}`}
                      onClick={() =>
                        setValue("discountType", "pwd", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="cash-payment-option-title">PWD</span>
                      <span className="cash-payment-option-sub">20%</span>
                    </button>
                    <button
                      type="button"
                      className={`cash-payment-option ${selectedDiscountType === "senior" ? "active" : ""}`}
                      onClick={() =>
                        setValue("discountType", "senior", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="cash-payment-option-title">Senior</span>
                      <span className="cash-payment-option-sub">20%</span>
                    </button>
                  </div>
                </div>

                <div className="cash-payment-card">
                  <label className="form-label cash-payment-card-label">Method</label>
                  <div className="cash-payment-option-grid cash-payment-option-grid-3">
                    <button
                      type="button"
                      className={`cash-payment-option ${selectedMethod === "cash" ? "active" : ""}`}
                      onClick={() =>
                        setValue("method", "cash", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="cash-payment-option-title">Cash</span>
                    </button>
                    <button
                      type="button"
                      className={`cash-payment-option ${selectedMethod === "gcash" ? "active" : ""}`}
                      onClick={() =>
                        setValue("method", "gcash", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="cash-payment-option-title">GCash</span>
                    </button>
                    <button
                      type="button"
                      className={`cash-payment-option ${selectedMethod === "qr" ? "active" : ""}`}
                      onClick={() =>
                        setValue("method", "qr", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="cash-payment-option-title">QR</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="small border rounded p-2 bg-light cash-orders-totals-card">
                <div className="d-flex justify-content-between">
                  <span>Total</span>
                  <strong>{currency(selectedOrderTotal)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Per Person</span>
                  <strong>{currency(selectedSharePerPerson)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Discounted Persons</span>
                  <strong>
                    {selectedDiscountedPersons}/{selectedTotalPersons}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Discount</span>
                  <strong>- {currency(selectedDiscountAmount)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Amount Due</span>
                  <strong>{currency(selectedAmountDue)}</strong>
                </div>
              </div>

              <div className="cash-payment-card">
                {selectedDiscountType !== "none" ? (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-6">
                        <label className="form-label cash-payment-card-label">Total Persons</label>
                        <input
                          className="form-control cash-orders-input"
                          type="number"
                          min={1}
                          step={1}
                          {...register("totalPersons", {
                            setValueAs: (value) =>
                              value === "" || value === null
                                ? undefined
                                : Number(value),
                          })}
                        />
                        <small className="text-danger">{errors.totalPersons?.message}</small>
                      </div>
                      <div className="col-6">
                        <label className="form-label cash-payment-card-label">Discounted Persons</label>
                        <input
                          className="form-control cash-orders-input"
                          type="number"
                          min={1}
                          step={1}
                          {...register("discountedPersons", {
                            setValueAs: (value) =>
                              value === "" || value === null
                                ? undefined
                                : Number(value),
                          })}
                        />
                        <small className="text-danger">{errors.discountedPersons?.message}</small>
                      </div>
                    </div>
                  </>
                ) : null}

                {selectedMethod === "cash" ? (
                  <>
                    <label className="form-label cash-payment-card-label">Amount Paid</label>
                    <input
                      className="form-control cash-orders-input"
                      type="number"
                      step="0.01"
                      min={selectedAmountDue}
                      placeholder="Enter cash received"
                      {...register("amountPaid", {
                        setValueAs: (value) =>
                          value === "" || value === null ? undefined : Number(value),
                        validate: (value) => {
                          if (selectedMethod !== "cash") return true;
                          if (value === undefined || Number.isNaN(Number(value))) {
                            return "Amount paid is required for cash";
                          }
                          if (Number(value) < selectedAmountDue) {
                            return `Amount paid must be at least ${currency(selectedAmountDue)}`;
                          }
                          return true;
                        },
                      })}
                    />
                    <small className="text-danger">{errors.amountPaid?.message}</small>
                  </>
                ) : (
                  <>
                    <label className="form-label cash-payment-card-label">
                      Last 4 Digits (Transaction Ref)
                    </label>
                    <input
                      className="form-control cash-orders-input"
                      maxLength={4}
                      placeholder="0000"
                      {...register("transferLast4", {
                        validate: (value) => {
                          return /^\d{4}$/.test(value || "")
                            ? true
                            : "Enter exactly 4 digits";
                        },
                      })}
                    />
                    <small className="text-danger">
                      {errors.transferLast4?.message}
                    </small>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer cash-orders-modal-footer">
              <button
                className="btn btn-secondary cash-orders-btn"
                type="button"
                data-bs-dismiss="modal"
              >
                Close
              </button>
              <button
                className="btn btn-primary cash-orders-btn cash-orders-btn-primary cash-payment-confirm-btn"
                disabled={isSubmitting || !canConfirmPayment}
              >
                {isSubmitting ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
