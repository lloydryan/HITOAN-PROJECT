import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
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
