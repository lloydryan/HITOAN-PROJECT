import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppUser, UserRole } from "../types";
import { createActivityLog } from "./logService";

export interface CreateManagedUserInput {
  displayName: string;
  employeeId: string;
  email: string;
  password: string;
  role: UserRole;
}

export async function getUserById(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function listUsers() {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[];
}

export async function createManagedUser(actor: AppUser, input: CreateManagedUserInput) {
  const existingId = await getUserByEmployeeId(input.employeeId);
  if (existingId) throw new Error("Employee ID already exists");

  const secondaryApp = initializeApp(auth.app.options, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.password);

    const userProfile = {
      displayName: input.displayName,
      employeeId: input.employeeId,
      email: input.email,
      role: input.role,
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "users", cred.user.uid), userProfile);

    await createActivityLog({
      action: "USER_ROLE_UPDATE",
      actorUid: actor.id,
      actorRole: actor.role,
      actorName: actor.displayName,
      entityType: "users",
      entityId: cred.user.uid,
      message: `Created user ${input.email} (${input.employeeId}) with role ${input.role}`,
      before: null,
      after: {
        displayName: input.displayName,
        employeeId: input.employeeId,
        email: input.email,
        role: input.role
      },
      metadata: { createdByAdmin: true }
    });

    return cred.user.uid;
  } finally {
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
  }
}

export async function getUserByEmployeeId(employeeId: string) {
  const q = query(collection(db, "users"), where("employeeId", "==", employeeId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const row = snap.docs[0];
  return { id: row.id, ...row.data() } as AppUser;
}

export async function validateCrewByEmployeeId(employeeId: string) {
  const q = query(
    collection(db, "users"),
    where("employeeId", "==", employeeId.trim()),
    where("role", "==", "crew"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const row = snap.docs[0];
  return { id: row.id, ...row.data() } as AppUser;
}

export async function validateAdminByEmployeeId(employeeId: string) {
  const q = query(
    collection(db, "users"),
    where("employeeId", "==", employeeId.trim()),
    where("role", "==", "admin"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const row = snap.docs[0];
  return { id: row.id, ...row.data() } as AppUser;
}

export async function updateUserRole(actor: AppUser, targetUid: string, role: UserRole) {
  const ref = doc(db, "users", targetUid);
  const before = await getDoc(ref);
  if (!before.exists()) throw new Error("User not found");
  const prev = before.data();
  if (prev.role === role) return;

  await updateDoc(ref, { role, updatedAt: serverTimestamp() });

  await createActivityLog({
    action: "USER_ROLE_UPDATE",
    actorUid: actor.id,
    actorRole: actor.role,
    actorName: actor.displayName,
    entityType: "users",
    entityId: targetUid,
    message: `Updated user role to ${role}`,
    before: prev,
    after: { ...prev, role },
    metadata: { role }
  });
}

export async function updateUserEmployeeId(actor: AppUser, targetUid: string, employeeId: string) {
  const normalized = employeeId.trim();
  if (!normalized) throw new Error("Employee ID is required");

  const existing = await getUserByEmployeeId(normalized);
  if (existing && existing.id !== targetUid) throw new Error("Employee ID already exists");

  const ref = doc(db, "users", targetUid);
  const before = await getDoc(ref);
  if (!before.exists()) throw new Error("User not found");
  const prev = before.data();
  if (prev.employeeId === normalized) return;

  await updateDoc(ref, { employeeId: normalized, updatedAt: serverTimestamp() });

  await createActivityLog({
    action: "USER_EMPLOYEE_ID_UPDATE",
    actorUid: actor.id,
    actorRole: actor.role,
    actorName: actor.displayName,
    entityType: "users",
    entityId: targetUid,
    message: `Updated employee ID to ${normalized}`,
    before: prev,
    after: { ...prev, employeeId: normalized },
    metadata: { employeeId: normalized }
  });
}
