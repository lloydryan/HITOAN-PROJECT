import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { AppUser, Payment, PaymentMethod } from "../types";

export async function processPayment(
  user: AppUser,
  orderId: string,
  method: PaymentMethod,
  amountPaid?: number,
  transferLast4?: string
) {
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Order not found");
  const order = orderSnap.data() as { total: number; paymentStatus: string };

  if (order.paymentStatus === "paid") throw new Error("Order already paid");

  const isCash = method === "cash";
  if (isCash && (!amountPaid || amountPaid < order.total)) {
    throw new Error("Amount is less than order total");
  }
  if (!isCash && (!transferLast4 || !/^\d{4}$/.test(transferLast4))) {
    throw new Error("Last 4 digits are required");
  }

  const finalAmountPaid = isCash ? Number(amountPaid) : order.total;
  const change = isCash ? Number((finalAmountPaid - order.total).toFixed(2)) : 0;

  const paymentRef = doc(collection(db, "payments"));
  const log1Ref = doc(collection(db, "activityLogs"));
  const log2Ref = doc(collection(db, "activityLogs"));
  const batch = writeBatch(db);

  const paymentData = {
    orderId,
    amountPaid: finalAmountPaid,
    method,
    change,
    transferLast4: isCash ? null : transferLast4,
    createdAt: serverTimestamp(),
    cashierId: user.id
  };

  batch.set(paymentRef, paymentData);
  batch.update(orderRef, {
    paymentStatus: "paid",
    updatedAt: serverTimestamp(),
    updatedBy: user.id
  });

  batch.set(log1Ref, {
    action: "PAYMENT_CREATE",
    actorUid: user.id,
    actorRole: user.role,
    actorName: user.displayName,
    entityType: "payments",
    entityId: paymentRef.id,
    message: `Created payment for order ${orderId}`,
    before: null,
    after: paymentData,
    metadata: { orderId, method, transferLast4: isCash ? null : transferLast4 },
    createdAt: serverTimestamp()
  });

  batch.set(log2Ref, {
    action: "ORDER_PAYMENT_UPDATE",
    actorUid: user.id,
    actorRole: user.role,
    actorName: user.displayName,
    entityType: "orders",
    entityId: orderId,
    message: "Updated order payment status to paid",
    before: { paymentStatus: order.paymentStatus },
    after: { paymentStatus: "paid" },
    metadata: { paymentId: paymentRef.id },
    createdAt: serverTimestamp()
  });

  await batch.commit();

  return {
    paymentId: paymentRef.id,
    amountPaid: finalAmountPaid,
    change
  };
}

export async function getPaymentsForCashier(cashierId: string) {
  const q = query(collection(db, "payments"), where("cashierId", "==", cashierId));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]).sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );
}

export async function getPaymentByOrderId(orderId: string, cashierId?: string) {
  const q = cashierId
    ? query(collection(db, "payments"), where("cashierId", "==", cashierId))
    : query(collection(db, "payments"), where("orderId", "==", orderId));
  const snap = await getDocs(q);
  console.log("[ReceiptDebug] getPaymentByOrderId:snapshot", {
    orderId,
    cashierId: cashierId ?? null,
    docs: snap.size
  });
  if (snap.empty) return null;
  const list = (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]).filter(
    (payment) => payment.orderId === orderId
  );
  console.log("[ReceiptDebug] getPaymentByOrderId:filtered", {
    orderId,
    cashierId: cashierId ?? null,
    matches: list.length
  });
  if (list.length === 0) return null;
  return list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))[0];
}
