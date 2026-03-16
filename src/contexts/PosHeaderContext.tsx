import { createContext, useContext, useState, ReactNode } from "react";

interface PosHeaderContextValue {
  search: string;
  setSearch: (value: string) => void;
}

const PosHeaderContext = createContext<PosHeaderContextValue | null>(null);

export function PosHeaderProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  return (
    <PosHeaderContext.Provider value={{ search, setSearch }}>
      {children}
    </PosHeaderContext.Provider>
  );
}

export function usePosHeader() {
  const ctx = useContext(PosHeaderContext);
  if (!ctx) return { search: "", setSearch: () => {} };
  return ctx;
}
