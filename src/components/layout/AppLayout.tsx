import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import POSTopbar from "./POSTopbar";
import { PosHeaderProvider } from "../../contexts/PosHeaderContext";

const isPOSCreateRoute = (path: string) =>
  path === "/crew/orders/new" || path === "/cashier/orders/new";

export default function AppLayout() {
  const { pathname } = useLocation();
  const isPOS = isPOSCreateRoute(pathname);

  if (isPOS) {
    return (
      <PosHeaderProvider>
        <div className="app-shell pos-fullscreen">
          <POSTopbar />
          <main className="pos-main-content">
            <Outlet />
          </main>
        </div>
      </PosHeaderProvider>
    );
  }

  return (
    <div className="d-flex app-shell">
      <Sidebar />
      <div className="flex-grow-1 app-main-wrap">
        <Topbar />
        <main className="container-fluid app-content p-3 p-lg-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
