import { ReactNode, createContext, useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isDemoMode } from "../firebase";
import { AppUser } from "../types";

const DEMO_USER: AppUser = {
  id: "demo-user",
  displayName: "Demo Cashier",
  email: "demo@hitoan.local",
  role: "cashier",
  employeeId: "DEMO001",
};

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    if (isDemoMode || !auth) {
      setUser(DEMO_USER);
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (isDemoMode || !auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  useEffect(() => {
    if (isDemoMode || !auth || !db) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snap.exists()) {
        setUser(null);
        await signOut(auth);
        setLoading(false);
        return;
      }

      const data = snap.data();
      setUser({
        id: firebaseUser.uid,
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        employeeId: data.employeeId,
        createdAt: data.createdAt
      });
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}
