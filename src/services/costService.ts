import { collection, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { AppUser, CostLog } from "../types";
import { createDocWithLog } from "./firestoreWithLog";

export async function getCosts() {
  const q = query(collection(db, "costs"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CostLog[];
}

export async function createCost(user: AppUser, data: { type: string; value: number; note?: string }) {
  return createDocWithLog({
    collectionName: "costs",
    data: {
      ...data,
      createdBy: user.id,
      createdAt: serverTimestamp()
    },
    log: {
      action: "COST_CREATE",
      actorUid: user.id,
      actorRole: user.role,
      actorName: user.displayName,
      entityType: "costs",
      message: `Logged cost ${data.type}`,
      metadata: { value: data.value }
    }
  });
}
