import { useEffect, useMemo, useState } from "react";
import { AppUser, DiscountType, Order, OrderLine } from "../../types";
import {
  editOrderByAdmin,
  getAllOrders,
  updateOrderStatus,
  voidOrderByAdmin,
} from "../../services/orderService";
import {
  getPaymentByOrderId,
  processPayment,
} from "../../services/paymentService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { currency, dt } from "../../utils/format";
import { useForm } from "react-hook-form";
import { PaymentSchema, paymentSchema } from "../../schemas/paymentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { validateAdminByEmployeeId } from "../../services/userService";
import { Link } from "react-router-dom";
import OrdersTable from "./components/OrdersTable";
import {
  AdminAuthModal,
  AdminOrderActionModal,
  BillModal,
  ReceiptModal,
} from "./components/OrderAuxModals";

interface ReceiptData {
  order: Order;
  method: "cash" | "gcash" | "qr";
  discountType: DiscountType;
  discountRate: number;
  discountAmount: number;
  amountDue: number;
  amountPaid: number;
  change: number;
  transferLast4?: string;
  paidAt: string;
}

type BootstrapModalApi = {
  getInstance: (element: Element) => { hide: () => void } | null;
  getOrCreateInstance: (element: Element) => {
    hide: () => void;
    show: () => void;
  };
};

type BootstrapWindow = Window & {
  bootstrap?: {
    Modal: BootstrapModalApi & (new (element: Element) => { show: () => void });
  };
};

async function getModalInstance(element: Element) {
  const fromWindow = (window as BootstrapWindow).bootstrap?.Modal;
  if (fromWindow) return fromWindow.getOrCreateInstance(element);
  const bootstrapModule = await import("bootstrap");
  return bootstrapModule.Modal.getOrCreateInstance(element as HTMLElement);
}

async function hideModalAndWaitForClose(modalId: string) {
  const element = document.getElementById(modalId);
  if (!element) return;

  const modalApi = await getModalInstance(element);
  if (!element.classList.contains("show")) {
    modalApi.hide();
    return;
  }

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const onHidden = () => finish();
    element.addEventListener("hidden.bs.modal", onHidden, { once: true });
    const dismissBtn = element.querySelector<HTMLButtonElement>(
      '[data-bs-dismiss="modal"]',
    );
    if (dismissBtn) {
      // Use the same dismiss path as a manual user close for consistent behavior.
      dismissBtn.click();
    } else {
      modalApi.hide();
    }

    // Fallback so receipt flow doesn't get stuck if hidden event is missed.
    window.setTimeout(() => {
      if (!done) {
        modalApi.hide();
        finish();
      }
    }, 700);
  });
}

export default function CashierOrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rowPressTimer, setRowPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [adminTargetOrder, setAdminTargetOrder] = useState<Order | null>(null);
  const [adminIdInput, setAdminIdInput] = useState("");
  const [validatingAdmin, setValidatingAdmin] = useState(false);
  const [authorizedAdmin, setAuthorizedAdmin] = useState<AppUser | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [quickFilter, setQuickFilter] = useState<"all" | "unpaid" | "paid" | "ready">("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [editDraft, setEditDraft] = useState<{
    tableNumber: string;
    type: "dine-in" | "takeout";
    items: OrderLine[];
  } | null>(null);

  const load = () =>
    getAllOrders()
      .then(setOrders)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (rowPressTimer) {
        clearTimeout(rowPressTimer);
      }
    };
  }, [rowPressTimer]);

  const visible = useMemo(
    () => orders.filter((o) => o.status !== "cancelled"),
    [orders],
  );
  const todayKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
  const selectedDateLabel = useMemo(
    () =>
      new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [selectedDate],
  );
  const dateVisible = useMemo(
    () =>
      visible.filter((o) => {
        const created = o.createdAt?.toDate();
        if (!created) return false;
        const y = created.getFullYear();
        const m = String(created.getMonth() + 1).padStart(2, "0");
        const d = String(created.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}` === selectedDate;
      }),
    [visible, selectedDate],
  );
  const unpaidCount = useMemo(
    () => dateVisible.filter((o) => o.paymentStatus === "unpaid").length,
    [dateVisible],
  );
  const paidCount = useMemo(
    () => dateVisible.filter((o) => o.paymentStatus === "paid").length,
    [dateVisible],
  );
  const readyCount = useMemo(
    () => dateVisible.filter((o) => o.status === "ready").length,
    [dateVisible],
  );
  const filteredOrders = useMemo(
    () => {
      if (quickFilter === "unpaid") {
        return dateVisible.filter((o) => o.paymentStatus === "unpaid");
      }
      if (quickFilter === "paid") {
        return dateVisible.filter((o) => o.paymentStatus === "paid");
      }
      if (quickFilter === "ready") {
        return dateVisible.filter((o) => o.status === "ready");
      }
      return dateVisible;
    },
    [dateVisible, quickFilter],
  );

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
      transferLast4: "",
    },
  });

  const selectedMethod = watch("method");
  const selectedDiscountType = watch("discountType");
  const enteredAmountPaid = watch("amountPaid");
  const enteredTransferLast4 = watch("transferLast4");
  const selectedOrderTotal = selected?.total ?? 0;
  const selectedDiscountRate =
    selectedDiscountType === "pwd" || selectedDiscountType === "senior"
      ? 0.2
      : 0;
  const selectedDiscountAmount = Number(
    (selectedOrderTotal * selectedDiscountRate).toFixed(2),
  );
  const selectedAmountDue = Number(
    (selectedOrderTotal - selectedDiscountAmount).toFixed(2),
  );
  const editSubtotal = Number(
    (
      editDraft?.items.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        return sum + item.priceSnapshot * Math.max(0, qty);
      }, 0) || 0
    ).toFixed(2),
  );
  const editTax = Number((editSubtotal * 0.12).toFixed(2));
  const editTotal = Number((editSubtotal + editTax).toFixed(2));
  const hasMethod =
    selectedMethod === "cash" ||
    selectedMethod === "gcash" ||
    selectedMethod === "qr";
  const hasDiscount =
    selectedDiscountType === "none" ||
    selectedDiscountType === "pwd" ||
    selectedDiscountType === "senior";
  const hasCashAmount =
    !Number.isNaN(Number(enteredAmountPaid)) &&
    Number(enteredAmountPaid) >= selectedAmountDue;
  const hasTransferCode = /^\d{4}$/.test(enteredTransferLast4 || "");
  const canConfirmPayment =
    hasMethod &&
    hasDiscount &&
    (selectedMethod === "cash" ? hasCashAmount : hasTransferCode);

  const openPayment = (order: Order) => {
    setSelected(order);
    reset({
      amountPaid: undefined,
      transferLast4: "",
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
        hasBootstrap: !!(window as BootstrapWindow).bootstrap?.Modal,
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
    setEditDraft({
      tableNumber: order.tableNumber || "",
      type: order.type,
      items: order.items.map((item) => ({ ...item })),
    });
    const modal = document.getElementById("adminAuthModal");
    if (modal) {
      const modalApi = await getModalInstance(modal);
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
        const modalApi = await getModalInstance(nextModal);
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
    if (!window.confirm(`Void order ${adminTargetOrder.orderNumber}?`)) return;

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
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setAdminSubmitting(false);
    }
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
        hasBootstrap: !!(window as BootstrapWindow).bootstrap?.Modal,
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
    const companyName = "HITOAN Restaurant";
    const totalQty = receipt.order.items.reduce((sum, i) => sum + i.qty, 0);
    const receiptSubtotal = Number(
      receipt.order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
    );
    const receiptTax = Number((receipt.order.total - receiptSubtotal).toFixed(2));
    const win = window.open("", "_blank", "width=420,height=760");
    if (!win) return;

    const rows = receipt.order.items
      .map(
        (i) =>
          `<tr><td>${i.nameSnapshot}</td><td style="text-align:right;">${i.qty}</td><td style="text-align:right;">${currency(
            i.subtotal,
          )}</td></tr>`,
      )
      .join("");

    win.document.write(`
      <html>
      <head><title>Receipt ${receipt.order.orderNumber}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 16px;">
        <h3 style="margin:0 0 4px;">${companyName}</h3>
        <div style="margin-bottom:8px;">Official Receipt</div>
        <div>Order: ${receipt.order.orderNumber}</div>
        <div>Table: ${receipt.order.tableNumber || "-"}</div>
        <div>Created: ${dt(receipt.order.createdAt?.toDate())}</div>
        <div>Paid: ${dt(new Date(receipt.paidAt))}</div>
        <div>Method: ${receipt.method.toUpperCase()}</div>
        <div>Discount: ${receipt.discountType === "none" ? "None" : receipt.discountType.toUpperCase()}</div>
        ${
          receipt.method !== "cash"
            ? `<div>Ref (Last 4): ${receipt.transferLast4 || "N/A"}</div>`
            : ""
        }
        <div>Total Qty: ${totalQty}</div>
        <hr />
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr><th style="text-align:left;">Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <hr />
        <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><strong>${currency(receiptSubtotal)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Tax (12%)</span><strong>${currency(receiptTax)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(receipt.order.total)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Discount</span><strong>- ${currency(receipt.discountAmount)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Amount Due</span><strong>${currency(receipt.amountDue)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Amount Paid</span><strong>${currency(
          receipt.amountPaid,
        )}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Change</span><strong>${currency(
          receipt.change,
        )}</strong></div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const printBill = () => {
    if (!billOrder) return;
    const companyName = "HITOAN Restaurant";
    const totalQty = billOrder.items.reduce((sum, i) => sum + i.qty, 0);
    const billSubtotal = Number(
      billOrder.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
    );
    const billTax = Number((billOrder.total - billSubtotal).toFixed(2));
    const win = window.open("", "_blank", "width=420,height=760");
    if (!win) return;

    const rows = billOrder.items
      .map(
        (i) =>
          `<tr><td>${i.nameSnapshot}</td><td style="text-align:right;">${i.qty}</td><td style="text-align:right;">${currency(
            i.subtotal,
          )}</td></tr>`,
      )
      .join("");

    win.document.write(`
      <html>
      <head><title>Bill ${billOrder.orderNumber}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 16px;">
        <h3 style="margin:0 0 4px;">${companyName}</h3>
        <div style="margin-bottom:8px;">Customer Bill</div>
        <div>Order: ${billOrder.orderNumber}</div>
        <div>Table: ${billOrder.tableNumber || "-"}</div>
        <div>Created: ${dt(billOrder.createdAt?.toDate())}</div>
        <div>Total Qty: ${totalQty}</div>
        <hr />
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr><th style="text-align:left;">Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <hr />
        <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><strong>${currency(billSubtotal)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Tax (12%)</span><strong>${currency(billTax)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(billOrder.total)}</strong></div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
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
      </div>
      <div className="card cash-orders-card">
        <div className="card-body">
          <div className="cash-orders-header">
            <div>
              <h5 className="mb-1 cash-orders-title">Cashier Orders</h5>
              <p className="mb-0 cash-orders-subtitle">
                Showing orders for {selectedDate === todayKey ? "today" : "selected date"} ({selectedDateLabel}).
              </p>
            </div>
            <div className="cash-orders-kpis">
              <label className="cash-orders-date-wrap" htmlFor="cashierOrdersDate">
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
                onClick={() => setQuickFilter((prev) => (prev === "unpaid" ? "all" : "unpaid"))}
              >
                Unpaid <strong>{unpaidCount}</strong>
              </button>
              <button
                type="button"
                className={`cash-orders-kpi cash-orders-kpi-btn ${quickFilter === "paid" ? "cash-orders-kpi-active" : ""}`}
                onClick={() => setQuickFilter((prev) => (prev === "paid" ? "all" : "paid"))}
              >
                Paid <strong>{paidCount}</strong>
              </button>
              <button
                type="button"
                className={`cash-orders-kpi cash-orders-kpi-btn ${quickFilter === "ready" ? "cash-orders-kpi-active" : ""}`}
                onClick={() => setQuickFilter((prev) => (prev === "ready" ? "all" : "ready"))}
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
          onAdminIdChange={setAdminIdInput}
          onValidate={validateAdminId}
        />
        <AdminOrderActionModal
          orderNumber={adminTargetOrder?.orderNumber}
          authorizedAdmin={authorizedAdmin}
          editDraft={editDraft}
          editSubtotal={editSubtotal}
          editTax={editTax}
          editTotal={editTotal}
          adminSubmitting={adminSubmitting}
          paymentStatus={adminTargetOrder?.paymentStatus}
          onTypeChange={(value) =>
            setEditDraft((prev) => (prev ? { ...prev, type: value } : prev))
          }
          onTableChange={(value) =>
            setEditDraft((prev) => (prev ? { ...prev, tableNumber: value } : prev))
          }
          onItemQtyChange={setEditItemQty}
          onVoid={applyAdminVoid}
          onSave={applyAdminEdit}
        />

        <div className="modal fade cash-orders-modal" id="paymentModal" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content cash-orders-modal-content">
              <form onSubmit={handleSubmit(submitPayment)} className="cash-payment-form">
                <input type="hidden" {...register("discountType")} />
                <input type="hidden" {...register("method")} />
                <div className="modal-header cash-orders-modal-header">
                  <div>
                    <h5 className="modal-title mb-0">Process Payment</h5>
                    <small className="cash-payment-modal-subtitle">
                      Complete method, discount, and payment details.
                    </small>
                  </div>
                  <button
                    className="btn-close"
                    type="button"
                    data-bs-dismiss="modal"
                  />
                </div>
                <div className="modal-body d-grid gap-3 cash-orders-modal-body">
                  <div className="cash-payment-headline">
                    <p className="mb-0">
                      Order: <strong>{selected?.orderNumber}</strong>
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
                      <span>Discount</span>
                      <strong>- {currency(selectedDiscountAmount)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Amount Due</span>
                      <strong>{currency(selectedAmountDue)}</strong>
                    </div>
                  </div>

                  <div className="cash-payment-card">
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
                              value === "" || value === null
                                ? undefined
                                : Number(value),
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
                        <small className="text-danger">
                          {errors.amountPaid?.message}
                        </small>
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

        <BillModal billOrder={billOrder} onPrint={printBill} />
        <ReceiptModal receipt={receipt} onPrint={printReceipt} />
        </div>
      </div>
    </div>
  );
}
