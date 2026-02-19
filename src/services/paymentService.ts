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
  amountPaid: number,
  method: PaymentMethod
) {
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Order not found");
  const order = orderSnap.data() as { total: number; paymentStatus: string };

  if (order.paymentStatus === "paid") throw new Error("Order already paid");
  if (amountPaid < order.total) throw new Error("Amount is less than order total");

  const paymentRef = doc(collection(db, "payments"));
  const log1Ref = doc(collection(db, "activityLogs"));
  const log2Ref = doc(collection(db, "activityLogs"));
  const batch = writeBatch(db);

  const paymentData = {
    orderId,
    amountPaid,
    method,
    change: Number((amountPaid - order.total).toFixed(2)),
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
    metadata: { orderId, method },
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
}

export async function getPaymentsForCashier(cashierId: string) {
  const q = query(collection(db, "payments"), where("cashierId", "==", cashierId));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]).sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );
}
