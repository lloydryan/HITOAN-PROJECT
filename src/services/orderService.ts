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
import { AppUser, MenuItem, Order, OrderLine, OrderType, OrderStatus, UserRole } from "../types";
import { createDocWithLog, updateDocWithLog } from "./firestoreWithLog";

const TAX_RATE = 0.12;

export function makeOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  return `ORD-${stamp}`;
}

interface CreateOrderOptions {
  initialStatus?: OrderStatus;
  actorUid?: string;
  actorRole?: UserRole;
  actorName?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export async function createOrder(
  user: AppUser,
  orderType: OrderType,
  lines: Array<{ item: MenuItem; qty: number }>,
  crew: { uid: string; employeeId: string; displayName: string },
  tableNumber: string,
  options?: CreateOrderOptions
) {
  if (!db) return "demo-order-id";
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
  const initialStatus = options?.initialStatus || "pending";
  const actorUid = options?.actorUid || crew.uid;
  const actorRole = options?.actorRole || "crew";
  const actorName = options?.actorName || `${crew.displayName} [${crew.employeeId}]`;
  const message = options?.message || `Created order for ${crew.employeeId}`;

  return createDocWithLog({
    collectionName: "orders",
    data: {
      orderNumber: makeOrderNumber(),
      type: orderType,
      tableNumber,
      crewUid: crew.uid,
      crewEmployeeId: crew.employeeId,
      crewName: crew.displayName,
      status: initialStatus,
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
      actorUid,
      actorRole,
      actorName,
      entityType: "orders",
      message,
      metadata: {
        itemCount: items.length,
        total,
        tableNumber,
        crewEmployeeId: crew.employeeId,
        crewUid: crew.uid,
        createdViaUid: user.id,
        createdViaName: user.displayName,
        ...(options?.metadata || {})
      }
    }
  });
}

export async function getOrdersForCrew(uid: string) {
  if (!db) return [];
  const q = query(collection(db, "orders"), where("createdBy", "==", uid));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]).sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );
}

export async function getAllOrders() {
  if (!db) return [];
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
}

export function subscribeKitchenQueue(onData: (orders: Order[]) => void) {
  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, "orders"), where("status", "in", ["pending", "preparing", "ready"]));
  return onSnapshot(q, (snap) => {
    onData(
      (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]).sort(
        (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
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

export async function editOrderByAdmin(
  admin: AppUser,
  order: Order,
  updates: {
    type: OrderType;
    tableNumber: string;
    items: OrderLine[];
  }
) {
  const nextItems = updates.items
    .map((item) => {
      const qty = Number(item.qty);
      const normalizedQty = Number.isFinite(qty) ? qty : 0;
      return {
        menuItemId: item.menuItemId,
        nameSnapshot: item.nameSnapshot,
        priceSnapshot: item.priceSnapshot,
        qty: normalizedQty,
        subtotal: Number((item.priceSnapshot * normalizedQty).toFixed(2))
      };
    })
    .filter((item) => item.qty > 0);

  if (nextItems.length === 0) {
    throw new Error("Order must have at least one item.");
  }

  const subtotal = Number(nextItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  return updateDocWithLog({
    collectionName: "orders",
    id: order.id,
    updates: {
      type: updates.type,
      tableNumber: updates.tableNumber.trim(),
      items: nextItems,
      subtotal,
      tax,
      total,
      updatedAt: serverTimestamp(),
      updatedBy: admin.id
    },
    log: {
      action: "ORDER_EDIT",
      actorUid: admin.id,
      actorRole: admin.role,
      actorName: admin.displayName,
      entityType: "orders",
      message: `Edited order ${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        tableNumber: updates.tableNumber.trim(),
        type: updates.type,
        itemCount: nextItems.length,
        total,
        authorizedByEmployeeId: admin.employeeId || null
      }
    }
  });
}

export async function voidOrderByAdmin(admin: AppUser, order: Order) {
  if (order.paymentStatus === "paid") {
    throw new Error("Paid orders cannot be voided.");
  }
  if (order.status === "cancelled") return;

  return updateDocWithLog({
    collectionName: "orders",
    id: order.id,
    updates: {
      status: "cancelled",
      updatedAt: serverTimestamp(),
      updatedBy: admin.id
    },
    log: {
      action: "ORDER_VOID",
      actorUid: admin.id,
      actorRole: admin.role,
      actorName: admin.displayName,
      entityType: "orders",
      message: `Voided order ${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        authorizedByEmployeeId: admin.employeeId || null
      }
    }
  });
}
