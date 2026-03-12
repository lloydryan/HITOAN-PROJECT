import { ReactNode, createContext, useMemo, useState } from "react";

type ToastVariant = "success" | "danger" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (title: string, message: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (title: string, message: string, variant: ToastVariant = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, title, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const value = useMemo(() => ({ showToast }), []);

  const variantIcon: Record<ToastVariant, string> = {
    success: "✓",
    danger: "✕",
    warning: "!",
    info: "i",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pos-toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pos-toast pos-toast-${toast.variant}`}
            role="alert"
          >
            <div className="pos-toast-icon">{variantIcon[toast.variant]}</div>
            <div className="pos-toast-content">
              <div className="pos-toast-title">{toast.title}</div>
              <div className="pos-toast-message">{toast.message}</div>
            </div>
            <button
              type="button"
              className="pos-toast-close"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
