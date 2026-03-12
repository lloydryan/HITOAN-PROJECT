import { collection, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db, isDemoMode } from "../firebase";
import { AppUser, MenuItem } from "../types";
import { createDocWithLog, deleteDocWithLog, updateDocWithLog } from "./firestoreWithLog";

const DEMO_MENU: MenuItem[] = [
  { id: "1", name: "Hitoan Fried Rice", price: 85, category: "Rice", isAvailable: true },
  { id: "2", name: "Garlic Butter Shrimp", price: 120, category: "Seafood", isAvailable: true },
  { id: "3", name: "Buko Juice", price: 45, category: "Drinks", isAvailable: true },
  { id: "4", name: "Lumpia Shanghai", price: 65, category: "Appetizer", isAvailable: true },
  { id: "5", name: "Chicken Adobo", price: 95, category: "Rice", isAvailable: true },
  { id: "6", name: "Iced Coffee", price: 55, category: "Drinks", isAvailable: true },
];

export async function getMenuItems(): Promise<MenuItem[]> {
  if (isDemoMode || !db) return DEMO_MENU;
  const q = query(collection(db, "menuItems"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MenuItem[];
}

export async function createMenuItem(
  user: AppUser,
  data: Pick<MenuItem, "name" | "price" | "category" | "isAvailable">
) {
  return createDocWithLog({
    collectionName: "menuItems",
    data: { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    log: {
      action: "MENU_CREATE",
      actorUid: user.id,
      actorRole: user.role,
      actorName: user.displayName,
      entityType: "menuItems",
      message: `Created menu item ${data.name}`
    }
  });
}

export async function updateMenuItem(
  user: AppUser,
  id: string,
  data: Partial<Pick<MenuItem, "name" | "price" | "category" | "isAvailable">>
) {
  return updateDocWithLog({
    collectionName: "menuItems",
    id,
    updates: { ...data, updatedAt: serverTimestamp() },
    log: {
      action: "MENU_UPDATE",
      actorUid: user.id,
      actorRole: user.role,
      actorName: user.displayName,
      entityType: "menuItems",
      message: `Updated menu item ${id}`
    }
  });
}

export async function deleteMenuItem(user: AppUser, id: string) {
  return deleteDocWithLog({
    collectionName: "menuItems",
    id,
    log: {
      action: "MENU_DELETE",
      actorUid: user.id,
      actorRole: user.role,
      actorName: user.displayName,
      entityType: "menuItems",
      message: `Deleted menu item ${id}`
    }
  });
}
