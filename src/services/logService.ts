import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { UserRole } from "../types";

export interface ActivityLogInput {
  action: string;
  actorUid: string;
  actorRole: UserRole;
  actorName: string;
  entityType: string;
  entityId: string;
  message: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export async function createActivityLog(input: ActivityLogInput) {
  await addDoc(collection(db, "activityLogs"), {
    ...input,
    createdAt: serverTimestamp()
  });
}
