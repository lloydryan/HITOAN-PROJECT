import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { requireDb } from "../firebase";
import { AppUser, Order, VoidRequest } from "../types";
import { createDocWithLog, updateDocWithLog } from "./firestoreWithLog";

export async function createVoidRequest(
  requester: AppUser,
  order: Order,
  note?: string,
) {
  const db = requireDb();
  const existingQ = query(
    collection(db, "voidRequests"),
    where("orderId", "==", order.id),
  );
  const existingSnap = await getDocs(existingQ);
  const hasPending = existingSnap.docs.some(
    (d) => (d.data() as { status?: string }).status === "pending",
  );
  if (hasPending) {
    throw new Error("A pending void request already exists for this order.");
  }

  return createDocWithLog({
    collectionName: "voidRequests",
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber || "",
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      requesterUid: requester.id,
      requesterName: requester.displayName,
      requesterRole: requester.role,
      requesterEmployeeId: requester.employeeId || "",
      note: (note || "").trim(),
      status: "pending",
      createdAt: serverTimestamp(),
    },
    log: {
      action: "VOID_REQUEST_CREATE",
      actorUid: requester.id,
      actorRole: requester.role,
      actorName: requester.displayName,
      entityType: "voidRequests",
      message: `Requested admin review for order ${order.orderNumber}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      },
    },
  });
}

export async function getPendingVoidRequests() {
  const db = requireDb();
  const q = query(collection(db, "voidRequests"), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VoidRequest[]).sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
}

export async function resolveVoidRequest(
  admin: AppUser,
  req: VoidRequest,
  note?: string,
) {
  return updateDocWithLog({
    collectionName: "voidRequests",
    id: req.id,
    updates: {
      status: "resolved",
      resolutionNote: (note || "").trim(),
      resolvedAt: serverTimestamp(),
      resolvedByUid: admin.id,
      resolvedByName: admin.displayName,
    },
    log: {
      action: "VOID_REQUEST_RESOLVE",
      actorUid: admin.id,
      actorRole: admin.role,
      actorName: admin.displayName,
      entityType: "voidRequests",
      message: `Resolved void request for order ${req.orderNumber}`,
      metadata: {
        requestId: req.id,
        orderId: req.orderId,
        orderNumber: req.orderNumber,
      },
    },
  });
}
