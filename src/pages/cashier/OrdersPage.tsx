import { useEffect, useMemo, useState } from "react";
import { AppUser, Order, OrderLine, Payment } from "../../types";
import {
  editOrderByAdmin,
  getAllOrders,
  updateOrderStatus,
  voidOrderByAdmin,
} from "../../services/orderService";
import {
  getPaymentByOrderId,
  getPaymentsForCashier,
  processPayment,
} from "../../services/paymentService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { currency } from "../../utils/format";
import { useForm } from "react-hook-form";
import { PaymentSchema, paymentSchema } from "../../schemas/paymentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { validateAdminByEmployeeId } from "../../services/userService";
import { Link, useNavigate } from "react-router-dom";
import OrdersTable from "./components/OrdersTable";
import PaymentModal from "./components/PaymentModal";
import {
  AdminAuthModal,
  AdminOrderActionModal,
  BillModal,
  ReceiptModal,
} from "./components/OrderAuxModals";
import {
  getModalInstance,
  hideModalAndWaitForClose,
} from "./utils/modalHelpers";
import {
  printBillDoc,
  printDailySalesDoc,
  printReceiptDoc,
} from "./utils/printDocs";
import { ReceiptData } from "./types";
import { useCashierOrderFilters } from "./hooks/useCashierOrderFilters";
import { computeDiscountBreakdown } from "../../utils/paymentDiscount";
import { computeOrderTotals } from "../../utils/orderPricing";
import { createVoidRequest } from "../../services/voidRequestService";

export default function CashierOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowPressTimer, setRowPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [adminTargetOrder, setAdminTargetOrder] = useState<Order | null>(null);
  const [adminIdInput, setAdminIdInput] = useState("");
  const [validatingAdmin, setValidatingAdmin] = useState(false);
  const [authorizedAdmin, setAuthorizedAdmin] = useState<AppUser | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [requestingVoid, setRequestingVoid] = useState(false);
  const [confirmVoidOpen, setConfirmVoidOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    tableNumber: string;
    type: "dine-in" | "takeout";
    items: OrderLine[];
    vatEnabled: boolean;
  } | null>(null);

  const load = async () => {
    const [nextOrders, nextPayments] = await Promise.all([
      getAllOrders(),
      user ? getPaymentsForCashier(user.id) : Promise.resolve([] as Payment[]),
    ]);
    setOrders(nextOrders);
    setPayments(nextPayments);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    load().finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (rowPressTimer) {
        clearTimeout(rowPressTimer);
      }
    };
  }, [rowPressTimer]);

  const {
    quickFilter,
    setQuickFilter,
    selectedDate,
    setSelectedDate,
    todayKey,
    selectedDateLabel,
    unpaidCount,
    paidCount,
    readyCount,
    filteredOrders,
  } = useCashierOrderFilters(orders);

  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dailySales = useMemo(() => {
    const totals = { cash: 0, gcash: 0, qr: 0 };
    for (const payment of payments) {
      const created = payment.createdAt?.toDate();
      if (!created || toDateKey(created) !== selectedDate) continue;
      const computedTotal = Number(payment.amountDue ?? (payment.amountPaid - payment.change));
      const amount = Number.isFinite(computedTotal) ? computedTotal : 0;
      if (payment.method === "cash") totals.cash += amount;
      if (payment.method === "gcash") totals.gcash += amount;
      if (payment.method === "qr") totals.qr += amount;
    }
    return {
      cash: Number(totals.cash.toFixed(2)),
      gcash: Number(totals.gcash.toFixed(2)),
      qr: Number(totals.qr.toFixed(2)),
    };
  }, [payments, selectedDate]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentSchema>({
    resolver: zodResolver(paymentSchema),
    shouldUnregister: true,
    defaultValues: {
      amountPaid: undefined,
      totalPersons: 1,
      discountedPersons: 0,
      transferLast4: "",
    },
  });

  const selectedMethod = watch("method");
  const selectedDiscountType = watch("discountType");
  const enteredAmountPaid = watch("amountPaid");
  const enteredTotalPersons = watch("totalPersons");
  const enteredDiscountedPersons = watch("discountedPersons");
  const enteredTransferLast4 = watch("transferLast4");
  const selectedOrderTotal = selected?.total ?? 0;
  const discountPreview = computeDiscountBreakdown({
    orderTotal: selectedOrderTotal,
    discountType: selectedDiscountType || "none",
    totalPersons: enteredTotalPersons,
    discountedPersons: enteredDiscountedPersons,
  });
  const selectedDiscountAmount = discountPreview.discountAmount;
  const selectedAmountDue = discountPreview.amountDue;
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
  const hasMethod =
    selectedMethod === "cash" ||
    selectedMethod === "gcash" ||
    selectedMethod === "qr";
  const hasDiscount =
    selectedDiscountType === "none" ||
    selectedDiscountType === "pwd" ||
    selectedDiscountType === "senior";
  const hasValidDiscountPeople =
    selectedDiscountType === "none" ||
    (Number(enteredTotalPersons) >= 1 &&
      Number(enteredDiscountedPersons) >= 1 &&
      Number(enteredDiscountedPersons) <= Number(enteredTotalPersons));
  const hasCashAmount =
    !Number.isNaN(Number(enteredAmountPaid)) &&
    Number(enteredAmountPaid) >= selectedAmountDue;
  const hasTransferCode = /^\d{4}$/.test(enteredTransferLast4 || "");
  const canConfirmPayment =
    hasMethod &&
    hasDiscount &&
    hasValidDiscountPeople &&
    (selectedMethod === "cash" ? hasCashAmount : hasTransferCode);

  const openPayment = (order: Order) => {
    setSelected(order);
    reset({
      amountPaid: undefined,
      totalPersons: 1,
      discountedPersons: 0,
      transferLast4: "",
    });
  };

  const openAddItemPage = (order: Order) => {
    navigate("/cashier/orders/new", {
      state: {
        mode: "add-items",
        order,
      },
    });
  };

  const submitPayment = async (values: PaymentSchema) => {
    console.log("[ReceiptDebug] submitPayment:start", {
      selectedOrderId: selected?.id,
      method: values.method,
      discountType: values.discountType,
      amountPaid: values.amountPaid,
    });
    if (!user || !selected) return;
    if (
      values.method === "cash" &&
      (!values.amountPaid || values.amountPaid <= 0)
    ) {
      showToast("Validation", "Enter valid amount paid", "warning");
      return;
    }
    if (
      values.method === "cash" &&
      (values.amountPaid ?? 0) < selectedAmountDue
    ) {
      showToast(
        "Validation",
        `Amount paid must be at least ${currency(selectedAmountDue)}`,
        "warning",
      );
      return;
    }
    if (
      (values.method === "gcash" || values.method === "qr") &&
      !/^\d{4}$/.test(values.transferLast4 || "")
    ) {
      showToast("Validation", "Enter last 4 digits of transaction", "warning");
      return;
    }
    try {
      const result = await processPayment(
        user,
        selected.id,
        values.method,
        values.amountPaid,
        values.transferLast4,
        values.discountType,
        values.totalPersons,
        values.discountedPersons,
      );
      console.log("[ReceiptDebug] submitPayment:paymentProcessed", {
        orderId: selected.id,
        method: values.method,
        amountPaid: result.amountPaid,
        change: result.change,
      });
      showToast("Success", "Payment processed");
      setReceipt({
        order: selected,
        method: values.method,
        discountType: result.discountType,
        discountRate: result.discountRate,
        totalPersons: result.totalPersons,
        discountedPersons: result.discountedPersons,
        sharePerPerson: result.sharePerPerson,
        discountAmount: result.discountAmount,
        amountDue: result.amountDue,
        amountPaid: result.amountPaid,
        change: result.change,
        transferLast4: values.transferLast4,
        paidAt: new Date().toISOString(),
      });
      await load();
      await hideModalAndWaitForClose("paymentModal");
      const receiptModal = document.getElementById("receiptModal");
      console.log("[ReceiptDebug] submitPayment:openModalAttempt", {
        hasReceiptModal: !!receiptModal,
      });
      if (receiptModal) {
        const receiptModalApi = await getModalInstance(receiptModal);
        receiptModalApi.show();
      }
      setSelected(null);
    } catch (e) {
      console.error("[ReceiptDebug] submitPayment:error", e);
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const openAdminAuthorizationModal = async (order: Order) => {
    setAdminTargetOrder(order);
    setAdminIdInput("");
    setValidatingAdmin(false);
    setAuthorizedAdmin(null);
    setAdminSubmitting(false);
    setRequestingVoid(false);
    setEditDraft({
      tableNumber: order.tableNumber || "",
      type: order.type,
      items: order.items.map((item) => ({ ...item })),
      vatEnabled: order.vatEnabled ?? true,
    });
    const modal = document.getElementById("adminAuthModal");
    if (modal) {
      const modalApi = await getModalInstance(modal, {
        backdrop: "static",
        keyboard: false,
      });
      modalApi.show();
    }
  };

  const startRowLongPress = (order: Order) => {
    if (rowPressTimer) {
      clearTimeout(rowPressTimer);
    }
    const timer = setTimeout(() => {
      void openAdminAuthorizationModal(order);
      setRowPressTimer(null);
    }, 650);
    setRowPressTimer(timer);
  };

  const cancelRowLongPress = () => {
    if (rowPressTimer) {
      clearTimeout(rowPressTimer);
      setRowPressTimer(null);
    }
  };

  const validateAdminId = async () => {
    const employeeId = adminIdInput.trim();
    if (!employeeId) {
      showToast("Validation", "Enter admin employee ID", "warning");
      return;
    }

    setValidatingAdmin(true);
    try {
      const admin = await validateAdminByEmployeeId(employeeId);
      if (!admin) {
        setAuthorizedAdmin(null);
        showToast("Invalid ID", "Admin employee ID not found", "danger");
        return;
      }
      setAuthorizedAdmin(admin);
      showToast("Authorized", `${admin.displayName} is authorized.`);
      await hideModalAndWaitForClose("adminAuthModal");
      const nextModal = document.getElementById("orderAdminActionModal");
      if (nextModal) {
        const modalApi = await getModalInstance(nextModal, {
          backdrop: "static",
          keyboard: false,
        });
        modalApi.show();
      }
    } catch (e) {
      setAuthorizedAdmin(null);
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setValidatingAdmin(false);
    }
  };

  const setEditItemQty = (index: number, nextQty: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item, idx) =>
        idx === index
          ? { ...item, qty: Math.max(0, Number(nextQty) || 0) }
          : item,
      );
      return { ...prev, items };
    });
  };

  const removeEditItem = (index: number) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index),
      };
    });
  };

  const applyAdminEdit = async () => {
    if (!authorizedAdmin || !adminTargetOrder || !editDraft) return;
    if (!editDraft.items.some((item) => (Number(item.qty) || 0) > 0)) {
      showToast(
        "Validation",
        "Order must have at least one item with qty > 0.",
        "warning",
      );
      return;
    }

    setAdminSubmitting(true);
    try {
      await editOrderByAdmin(authorizedAdmin, adminTargetOrder, {
        tableNumber: editDraft.tableNumber,
        type: editDraft.type,
        items: editDraft.items,
        vatEnabled: editDraft.vatEnabled,
      });
      showToast("Success", "Order updated");
      await load();
      await hideModalAndWaitForClose("orderAdminActionModal");
      setAdminTargetOrder(null);
      setAuthorizedAdmin(null);
      setEditDraft(null);
      setAdminIdInput("");
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const applyAdminVoid = async () => {
    if (!authorizedAdmin || !adminTargetOrder) return;

    setAdminSubmitting(true);
    try {
      await voidOrderByAdmin(authorizedAdmin, adminTargetOrder);
      showToast("Success", "Order voided");
      await load();
      await hideModalAndWaitForClose("orderAdminActionModal");
      setAdminTargetOrder(null);
      setAuthorizedAdmin(null);
      setEditDraft(null);
      setAdminIdInput("");
      setConfirmVoidOpen(false);
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const askAdminVoidConfirm = () => {
    setConfirmVoidOpen(true);
  };

  const serve = async (order: Order) => {
    if (!user) return;
    try {
      await updateOrderStatus(user, order.id, "served");
      showToast("Success", "Order marked as served");
      await load();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const openReceiptForOrder = async (order: Order) => {
    console.log("[ReceiptDebug] openReceiptForOrder:start", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      userId: user?.id,
    });
    if (!user) return;
    try {
      const ownPayment = await getPaymentByOrderId(order.id, user.id);
      console.log("[ReceiptDebug] openReceiptForOrder:ownPayment", ownPayment);
      const payment = ownPayment ?? (await getPaymentByOrderId(order.id));
      console.log(
        "[ReceiptDebug] openReceiptForOrder:resolvedPayment",
        payment,
      );
      if (!payment) {
        showToast(
          "No receipt",
          "No payment record found for this order.",
          "warning",
        );
        return;
      }
      setReceipt({
        order,
        method: payment.method,
        discountType: payment.discountType || "none",
        discountRate: payment.discountRate || 0,
        totalPersons: payment.totalPersons || 1,
        discountedPersons: payment.discountedPersons || 0,
        sharePerPerson: payment.sharePerPerson || Number((order.total / Math.max(1, payment.totalPersons || 1)).toFixed(2)),
        discountAmount: payment.discountAmount || 0,
        amountDue: payment.amountDue || order.total,
        amountPaid: payment.amountPaid,
        change: payment.change,
        transferLast4: payment.transferLast4,
        paidAt:
          payment.createdAt?.toDate().toISOString() || new Date().toISOString(),
      });
      const receiptModal = document.getElementById("receiptModal");
      console.log("[ReceiptDebug] openReceiptForOrder:openModalAttempt", {
        hasReceiptModal: !!receiptModal,
      });
      if (receiptModal) {
        const receiptModalApi = await getModalInstance(receiptModal);
        receiptModalApi.show();
      }
    } catch (e) {
      console.error("[ReceiptDebug] openReceiptForOrder:error", e);
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const printReceipt = () => {
    if (!receipt) return;
    printReceiptDoc(receipt);
  };

  const printBill = () => {
    if (!billOrder) return;
    printBillDoc(billOrder);
  };

  const submitVoidRequest = async () => {
    if (!user || !adminTargetOrder) return;
    setRequestingVoid(true);
    try {
      await createVoidRequest(user, adminTargetOrder);
      showToast("Request sent", `Void request submitted for ${adminTargetOrder.orderNumber}.`);
      await hideModalAndWaitForClose("adminAuthModal");
      setAdminTargetOrder(null);
      setAuthorizedAdmin(null);
      setEditDraft(null);
      setAdminIdInput("");
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setRequestingVoid(false);
    }
  };

  const printDailySales = () => {
    printDailySalesDoc({
      dateLabel: selectedDateLabel,
      cash: dailySales.cash,
      gcash: dailySales.gcash,
      qr: dailySales.qr,
    });
  };

  return (
    <div className="cash-orders-page">
      <div className="cash-orders-page-head">
        <Link
          to="/cashier/orders/new"
          className="btn btn-primary cash-orders-btn cash-orders-btn-primary cash-orders-create-btn"
        >
          Create Order
        </Link>
        <div className="cash-orders-head-right">
          <button
            type="button"
            className="btn cash-orders-btn cash-orders-btn-bill cash-orders-print-daily-btn"
            onClick={printDailySales}
          >
            Print Daily Sales
          </button>
        </div>
      </div>
      <div className="card cash-orders-card">
        <div className="card-body">
          <div className="cash-orders-header">
            <div className="cash-orders-title-block">
              <div className="cash-orders-title-row">
                <h5 className="mb-1 cash-orders-title">Cashier Orders</h5>
                <div className="cash-orders-sales-strip">
                  <div className="cash-orders-sales-pill">
                    <span>Cash</span>
                    <strong>{currency(dailySales.cash)}</strong>
                  </div>
                  <div className="cash-orders-sales-pill">
                    <span>GCash</span>
                    <strong>{currency(dailySales.gcash)}</strong>
                  </div>
                  <div className="cash-orders-sales-pill">
                    <span>QR</span>
                    <strong>{currency(dailySales.qr)}</strong>
                  </div>
                </div>
              </div>
              <p className="mb-0 cash-orders-subtitle">
                Showing orders for{" "}
                {selectedDate === todayKey ? "today" : "selected date"} (
                {selectedDateLabel}).
              </p>
            </div>
            <div className="cash-orders-kpis">
              <label
                className="cash-orders-date-wrap"
                htmlFor="cashierOrdersDate"
              >
                <span className="cash-orders-date-label">Date</span>
                <input
                  id="cashierOrdersDate"
                  type="date"
                  className="form-control form-control-sm cash-orders-date-input"
                  value={selectedDate}
                  max={todayKey}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={`cash-orders-kpi cash-orders-kpi-btn ${quickFilter === "unpaid" ? "cash-orders-kpi-active" : ""}`}
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === "unpaid" ? "all" : "unpaid",
                  )
                }
              >
                Unpaid <strong>{unpaidCount}</strong>
              </button>
              <button
                type="button"
                className={`cash-orders-kpi cash-orders-kpi-btn ${quickFilter === "paid" ? "cash-orders-kpi-active" : ""}`}
                onClick={() =>
                  setQuickFilter((prev) => (prev === "paid" ? "all" : "paid"))
                }
              >
                Paid <strong>{paidCount}</strong>
              </button>
              <button
                type="button"
                className={`cash-orders-kpi cash-orders-kpi-btn ${quickFilter === "ready" ? "cash-orders-kpi-active" : ""}`}
                onClick={() =>
                  setQuickFilter((prev) => (prev === "ready" ? "all" : "ready"))
                }
              >
                Ready <strong>{readyCount}</strong>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="spinner-border text-primary cash-orders-spinner" />
          ) : (
            <OrdersTable
              orders={filteredOrders}
              onStartRowLongPress={startRowLongPress}
              onCancelRowLongPress={cancelRowLongPress}
              onAddItem={openAddItemPage}
              onShowBill={setBillOrder}
              onProcessPayment={openPayment}
              onViewReceipt={openReceiptForOrder}
              onMarkServed={serve}
            />
          )}

          <AdminAuthModal
            orderNumber={adminTargetOrder?.orderNumber}
            adminIdInput={adminIdInput}
            validatingAdmin={validatingAdmin}
            adminSubmitting={adminSubmitting}
            requestingVoid={requestingVoid}
            onAdminIdChange={setAdminIdInput}
            onValidate={validateAdminId}
            onRequestVoid={submitVoidRequest}
          />
          <AdminOrderActionModal
            orderNumber={adminTargetOrder?.orderNumber}
            authorizedAdmin={authorizedAdmin}
            editDraft={editDraft}
            editSubtotal={editSubtotal}
            editTax={editTax}
            editTotal={editTotal}
            vatEnabled={editDraft?.vatEnabled ?? true}
            adminSubmitting={adminSubmitting}
            paymentStatus={adminTargetOrder?.paymentStatus}
            onTypeChange={(value) =>
              setEditDraft((prev) => (prev ? { ...prev, type: value } : prev))
            }
            onTableChange={(value) =>
              setEditDraft((prev) =>
                prev ? { ...prev, tableNumber: value } : prev,
              )
            }
            onVatEnabledChange={(value) =>
              setEditDraft((prev) =>
                prev ? { ...prev, vatEnabled: value } : prev,
              )
            }
            onItemQtyChange={setEditItemQty}
            onRemoveItem={removeEditItem}
            onVoid={askAdminVoidConfirm}
            onSave={applyAdminEdit}
          />

          <PaymentModal
            selectedOrder={selected}
            selectedMethod={selectedMethod}
            selectedDiscountType={selectedDiscountType}
            selectedOrderTotal={selectedOrderTotal}
            selectedDiscountAmount={selectedDiscountAmount}
            selectedAmountDue={selectedAmountDue}
            selectedTotalPersons={discountPreview.totalPersons}
            selectedDiscountedPersons={discountPreview.discountedPersons}
            selectedSharePerPerson={discountPreview.sharePerPerson}
            enteredAmountPaid={enteredAmountPaid}
            errors={errors}
            isSubmitting={isSubmitting}
            canConfirmPayment={canConfirmPayment}
            register={register}
            setValue={setValue}
            onSubmit={handleSubmit(submitPayment)}
          />

          <BillModal billOrder={billOrder} onPrint={printBill} />
          <ReceiptModal receipt={receipt} onPrint={printReceipt} />

          {confirmVoidOpen && adminTargetOrder ? (
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
                    Void order <strong>{adminTargetOrder.orderNumber}</strong>?
                  </p>
                  <div className="logout-modal-actions">
                    <button
                      type="button"
                      className="logout-modal-btn logout-modal-btn-cancel"
                      onClick={() => setConfirmVoidOpen(false)}
                      disabled={adminSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="logout-modal-btn logout-modal-btn-confirm"
                      onClick={applyAdminVoid}
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
      </div>
    </div>
  );
}
