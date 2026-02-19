import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { AppUser, MenuItem, Order, OrderType, OrderStatus } from "../types";
import { createDocWithLog, updateDocWithLog } from "./firestoreWithLog";

const TAX_RATE = 0.12;

export function makeOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  return `ORD-${stamp}`;
}

export async function createOrder(
  user: AppUser,
  orderType: OrderType,
  lines: Array<{ item: MenuItem; qty: number }>,
  crew: { uid: string; employeeId: string; displayName: string }
) {
  const items = lines
    .filter((l) => l.qty > 0)
    .map((l) => ({
      menuItemId: l.item.id,
      nameSnapshot: l.item.name,
      priceSnapshot: l.item.price,
      qty: l.qty,
      subtotal: l.item.price * l.qty
    }));

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  return createDocWithLog({
    collectionName: "orders",
    data: {
      orderNumber: makeOrderNumber(),
      type: orderType,
      crewUid: crew.uid,
      crewEmployeeId: crew.employeeId,
      crewName: crew.displayName,
      status: "pending",
      paymentStatus: "unpaid",
      items,
      subtotal,
      tax,
      total,
      createdAt: serverTimestamp(),
      createdBy: user.id,
      updatedAt: serverTimestamp(),
      updatedBy: user.id
    },
    log: {
      action: "ORDER_CREATE",
      actorUid: crew.uid,
      actorRole: "crew",
      actorName: `${crew.displayName} [${crew.employeeId}]`,
      entityType: "orders",
      message: `Created order for ${crew.employeeId}`,
      metadata: {
        itemCount: items.length,
        total,
        crewEmployeeId: crew.employeeId,
        crewUid: crew.uid,
        createdViaUid: user.id,
        createdViaName: user.displayName
      }
    }
  });
}

export async function getOrdersForCrew(uid: string) {
  const q = query(collection(db, "orders"), where("createdBy", "==", uid));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]).sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );
}

export async function getAllOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
}

export function subscribeKitchenQueue(onData: (orders: Order[]) => void) {
  const q = query(collection(db, "orders"), where("status", "in", ["pending", "preparing", "ready"]));
  return onSnapshot(q, (snap) => {
    onData(
      (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]).sort(
        (a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
      )
    );
  });
}

export async function updateOrderStatus(user: AppUser, orderId: string, status: OrderStatus) {
  return updateDocWithLog({
    collectionName: "orders",
    id: orderId,
    updates: {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: user.id
    },
    log: {
      action: "ORDER_STATUS_UPDATE",
      actorUid: user.id,
      actorRole: user.role,
      actorName: user.displayName,
      entityType: "orders",
      message: `Updated order status to ${status}`,
      metadata: { status }
    }
  });
}
