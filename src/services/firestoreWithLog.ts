import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { requireDb } from "../firebase";
import { ActivityLogInput } from "./logService";

type Actor = Pick<ActivityLogInput, "actorUid" | "actorRole" | "actorName">;

interface CreateWithLogInput {
  collectionName: string;
  data: Record<string, unknown>;
  log: Omit<ActivityLogInput, "entityId" | "before" | "after"> & Actor;
  id?: string;
}

interface UpdateWithLogInput {
  collectionName: string;
  id: string;
  updates: Record<string, unknown>;
  log: Omit<ActivityLogInput, "entityId" | "before" | "after"> & Actor;
}

interface DeleteWithLogInput {
  collectionName: string;
  id: string;
  log: Omit<ActivityLogInput, "entityId" | "before" | "after"> & Actor;
}

export async function createDocWithLog(input: CreateWithLogInput) {
  const db = requireDb();
  const targetRef = input.id
    ? doc(db, input.collectionName, input.id)
    : doc(collection(db, input.collectionName));
  const logRef = doc(collection(db, "activityLogs"));
  const batch = writeBatch(db);

  batch.set(targetRef, input.data);
  batch.set(logRef, {
    ...input.log,
    entityId: targetRef.id,
    before: null,
    after: input.data,
    createdAt: serverTimestamp()
  });

  await batch.commit();
  return targetRef.id;
}

export async function updateDocWithLog(input: UpdateWithLogInput) {
  const db = requireDb();
  const targetRef = doc(db, input.collectionName, input.id);
  const beforeSnap = await getDoc(targetRef);
  const before = beforeSnap.exists() ? beforeSnap.data() : null;
  await updateDoc(targetRef, input.updates);

  const logRef = doc(collection(db, "activityLogs"));
  await setDoc(logRef, {
    ...input.log,
    entityId: input.id,
    before,
    after: { ...(before ?? {}), ...input.updates },
    createdAt: serverTimestamp()
  });
}

export async function deleteDocWithLog(input: DeleteWithLogInput) {
  const db = requireDb();
  const targetRef = doc(db, input.collectionName, input.id);
  const beforeSnap = await getDoc(targetRef);
  const before = beforeSnap.exists() ? beforeSnap.data() : null;
  await deleteDoc(targetRef);

  const logRef = doc(collection(db, "activityLogs"));
  await setDoc(logRef, {
    ...input.log,
    entityId: input.id,
    before,
    after: null,
    createdAt: serverTimestamp()
  });
}
