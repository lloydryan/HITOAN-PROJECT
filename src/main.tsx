import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./styles.css";

async function init() {
  try {
    const [
      { BrowserRouter },
      { AuthProvider },
      { ToastProvider },
      { default: App },
      { default: ErrorBoundary },
    ] = await Promise.all([
      import("react-router-dom"),
      import("./contexts/AuthContext"),
      import("./contexts/ToastContext"),
      import("./App"),
      import("./components/ErrorBoundary"),
    ]);

    const root = document.getElementById("root")!;
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    const e = err as Error;
    const root = document.getElementById("root")!;
    root.innerHTML = `
      <div style="padding:2rem;font-family:Inter,sans-serif;max-width:560px;margin:2rem auto">
        <h2 style="color:#D32F2F">HITOAN POS – Setup Required</h2>
        <p style="color:#333">The app could not start. Common cause: missing Firebase configuration.</p>
        <pre style="background:#f5f5f5;padding:1rem;border-radius:8px;overflow:auto;font-size:14px">${e?.message || String(err)}</pre>
        <p style="color:#666;margin-top:1rem">
          Copy <code>.env.example</code> to <code>.env</code> and add your Firebase credentials (VITE_FIREBASE_*).
        </p>
      </div>
    `;
    console.error("App init error:", err);
  }
}

init();
