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
  enteredAmountPaid?: number;
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
  enteredAmountPaid = 0,
  errors,
  isSubmitting,
  canConfirmPayment,
  register,
  setValue,
  onSubmit,
}: PaymentModalProps) {
  return (
    <div className="modal fade pos-payment-modal" id="paymentModal" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content pos-payment-modal-content">
          <form onSubmit={onSubmit} className="pos-payment-form">
            <input type="hidden" {...register("discountType")} />
            <input type="hidden" {...register("method")} />
            <div className="modal-header pos-payment-header">
              <h5 className="modal-title mb-0">Payment</h5>
              <button className="btn-close" type="button" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pos-payment-body">
              <div className="pos-payment-total-block">
                <div className="pos-payment-order-label">Order #{selectedOrder?.orderNumber}</div>
                <div className="pos-payment-total-label">Total</div>
                <div className="pos-payment-total-amount">{currency(selectedOrderTotal)}</div>
              </div>

              <div className="pos-payment-section">
                <label className="pos-payment-section-label">Payment Method</label>
                <div className="pos-payment-method-grid">
                  <button
                    type="button"
                    className={`pos-payment-method-btn ${selectedMethod === "cash" ? "active" : ""}`}
                    onClick={() =>
                      setValue("method", "cash", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className={`pos-payment-method-btn ${selectedMethod === "gcash" ? "active" : ""}`}
                    onClick={() =>
                      setValue("method", "gcash", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    GCash
                  </button>
                  <button
                    type="button"
                    className={`pos-payment-method-btn ${selectedMethod === "qr" ? "active" : ""}`}
                    onClick={() =>
                      setValue("method", "qr", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    QR
                  </button>
                </div>
              </div>

              <div className="pos-payment-section">
                <label className="pos-payment-section-label">Discount</label>
                <div className="pos-payment-method-grid pos-payment-discount-grid">
                  <button
                    type="button"
                    className={`pos-payment-method-btn ${selectedDiscountType === "none" ? "active" : ""}`}
                    onClick={() =>
                      setValue("discountType", "none", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    No Discount
                  </button>
                  <button
                    type="button"
                    className={`pos-payment-method-btn ${selectedDiscountType === "pwd" ? "active" : ""}`}
                    onClick={() =>
                      setValue("discountType", "pwd", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    PWD (20%)
                  </button>
                  <button
                    type="button"
                    className={`pos-payment-method-btn ${selectedDiscountType === "senior" ? "active" : ""}`}
                    onClick={() =>
                      setValue("discountType", "senior", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    Senior (20%)
                  </button>
                </div>
              </div>

              <div className="pos-payment-summary">
                <div className="pos-payment-summary-row">
                  <span>Total</span>
                  <strong>{currency(selectedOrderTotal)}</strong>
                </div>
                <div className="pos-payment-summary-row">
                  <span>Per Person</span>
                  <strong>{currency(selectedSharePerPerson)}</strong>
                </div>
                <div className="pos-payment-summary-row">
                  <span>Discounted Persons</span>
                  <strong>
                    {selectedDiscountedPersons}/{selectedTotalPersons}
                  </strong>
                </div>
                <div className="pos-payment-summary-row">
                  <span>Discount</span>
                  <strong>- {currency(selectedDiscountAmount)}</strong>
                </div>
                <div className="pos-payment-summary-row pos-payment-summary-row-amount-due">
                  <span>Amount Due</span>
                  <strong>{currency(selectedAmountDue)}</strong>
                </div>
              </div>

              <div className="pos-payment-section">
                {selectedDiscountType !== "none" ? (
                  <div className="pos-payment-discount-fields">
                    <div>
                      <label className="pos-payment-section-label">Total Persons</label>
                      <input
                        className="form-control pos-payment-input"
                        type="number"
                        min={1}
                        step={1}
                        {...register("totalPersons", {
                          setValueAs: (value) =>
                            value === "" || value === null ? undefined : Number(value),
                        })}
                      />
                      <small className="text-danger">{errors.totalPersons?.message}</small>
                    </div>
                    <div>
                      <label className="pos-payment-section-label">Discounted Persons</label>
                      <input
                        className="form-control pos-payment-input"
                        type="number"
                        min={1}
                        step={1}
                        {...register("discountedPersons", {
                          setValueAs: (value) =>
                            value === "" || value === null ? undefined : Number(value),
                        })}
                      />
                      <small className="text-danger">{errors.discountedPersons?.message}</small>
                    </div>
                  </div>
                ) : null}

                {selectedMethod === "cash" ? (
                  <div className="pos-payment-cash-block">
                    <label className="pos-payment-section-label">Cash Received</label>
                    <input
                      className="form-control pos-payment-input pos-payment-cash-input"
                      type="number"
                      step="0.01"
                      min={selectedAmountDue}
                      placeholder="₱200"
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
                    {Number(enteredAmountPaid ?? 0) >= selectedAmountDue && (
                      <div className="pos-payment-change">
                        <span>Change</span>
                        <strong>{currency(Number(enteredAmountPaid ?? 0) - selectedAmountDue)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="pos-payment-section-label">Transaction Ref (Last 4 digits)</label>
                    <input
                      className="form-control pos-payment-input"
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
                    <small className="text-danger">{errors.transferLast4?.message}</small>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer pos-payment-footer">
              <button
                className="btn pos-btn-cancel-modal"
                type="button"
                data-bs-dismiss="modal"
              >
                Close
              </button>
              <button
                className="btn pos-btn-confirm-payment"
                type="submit"
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
