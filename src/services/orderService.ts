import {
  collection,
  doc,
  getDoc,
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
import { computeOrderTotals } from "../utils/orderPricing";

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
  vatEnabled?: boolean;
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

  const vatEnabled = options?.vatEnabled ?? false;
  const { subtotal, tax, total } = computeOrderTotals(
    items.reduce((sum, i) => sum + i.subtotal, 0),
    vatEnabled,
  );
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
      vatEnabled,
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
        vatEnabled,
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

export async function getCancelledOrders() {
  if (!db) return [];
  const q = query(collection(db, "orders"), where("status", "==", "cancelled"));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]).sort(
    (a, b) =>
      (b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0) -
      (a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0),
  );
}

export async function getOrderById(orderId: string) {
  if (!db) return null;
  const snap = await getDoc(doc(db, "orders", orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
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
    vatEnabled?: boolean;
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

  const vatEnabled = updates.vatEnabled ?? order.vatEnabled ?? true;
  const { subtotal, tax, total } = computeOrderTotals(
    nextItems.reduce((sum, item) => sum + item.subtotal, 0),
    vatEnabled,
  );

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
      vatEnabled,
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
        vatEnabled,
        authorizedByEmployeeId: admin.employeeId || null
      }
    }
  });
}

export async function addNewItemsToOrderByCashier(
  cashier: AppUser,
  order: Order,
  lines: Array<{ item: MenuItem; qty: number }>,
  options?: {
    vatEnabled?: boolean;
  },
) {
  if (cashier.role !== "cashier") {
    throw new Error("Only cashiers can add new items.");
  }

  if (order.paymentStatus !== "unpaid") {
    throw new Error("Only unpaid orders can receive new items.");
  }

  const seenIncomingIds = new Set<string>();

  const incomingItems = lines
    .filter((line) => line.qty > 0)
    .map((line) => ({
      menuItemId: line.item.id,
      nameSnapshot: line.item.name,
      priceSnapshot: line.item.price,
      qty: Number(line.qty),
      subtotal: Number((line.item.price * Number(line.qty)).toFixed(2)),
    }));

  if (incomingItems.length === 0) {
    throw new Error("Add at least one new item.");
  }

  for (const item of incomingItems) {
    if (seenIncomingIds.has(item.menuItemId)) {
      throw new Error(`"${item.nameSnapshot}" was selected more than once.`);
    }
    seenIncomingIds.add(item.menuItemId);
  }

  const nextItems = order.items.map((item) => ({
    ...item,
    qty: Number(item.qty),
    subtotal: Number((item.priceSnapshot * Number(item.qty)).toFixed(2)),
  }));

  for (const item of incomingItems) {
    const existingIndex = nextItems.findIndex(
      (existingItem) => existingItem.menuItemId === item.menuItemId,
    );

    if (existingIndex >= 0) {
      const nextQty = Number((nextItems[existingIndex].qty + item.qty).toFixed(2));
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        qty: nextQty,
        subtotal: Number((nextItems[existingIndex].priceSnapshot * nextQty).toFixed(2)),
      };
      continue;
    }

    nextItems.push(item);
  }

  const vatEnabled = options?.vatEnabled ?? false;
  const { subtotal, tax, total } = computeOrderTotals(
    nextItems.reduce((sum, item) => sum + item.subtotal, 0),
    vatEnabled,
  );

  return updateDocWithLog({
    collectionName: "orders",
    id: order.id,
    updates: {
      items: nextItems,
      subtotal,
      tax,
      total,
      updatedAt: serverTimestamp(),
      updatedBy: cashier.id,
    },
    log: {
      action: "ORDER_EDIT",
      actorUid: cashier.id,
      actorRole: cashier.role,
      actorName: cashier.displayName,
      entityType: "orders",
      message: `Cashier added new items to order ${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        addedItemCount: incomingItems.length,
        addedMenuItemIds: incomingItems.map((item) => item.menuItemId),
        total,
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
