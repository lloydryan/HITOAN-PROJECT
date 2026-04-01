import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../firebase";

export default function Sidebar() {
  const { user } = useAuth();
  const [pendingVoidCount, setPendingVoidCount] = useState(0);

  useEffect(() => {
    if (!db || user?.role !== "admin") {
      setPendingVoidCount(0);
      return;
    }

    const q = query(
      collection(db, "voidRequests"),
      where("status", "==", "pending"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingVoidCount(snap.size);
    });

    return () => unsub();
  }, [user?.role]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link app-nav-link ${isActive ? "active" : ""}`;

  const navItems = (
    <ul className="nav nav-pills flex-column gap-1">
      {user?.role === "admin" && (
        <>
          <li>
            <NavLink to="/admin/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/void-requests" className={linkClass}>
              <span>Void Requests</span>
              {pendingVoidCount > 0 && (
                <span className="app-nav-badge">{pendingVoidCount}</span>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/menu" className={linkClass}>
              Menu
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/costs" className={linkClass}>
              Costs
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={linkClass}>
              Users
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/logs" className={linkClass}>
              Activity Logs
            </NavLink>
          </li>
        </>
      )}
      {user?.role === "crew" && (
        <>
          <li>
            <NavLink to="/crew/orders/new" className={linkClass}>
              Create Order
            </NavLink>
          </li>
          <li>
            <NavLink to="/crew/orders" className={linkClass}>
              Orders
            </NavLink>
          </li>
        </>
      )}
      {user?.role === "kitchen" && (
        <li>
          <NavLink to="/kitchen/queue" className={linkClass}>
            Kitchen Queue
          </NavLink>
        </li>
      )}
      {user?.role === "cashier" && (
        <>
          <li>
            <NavLink to="/cashier/orders/new" className={linkClass} end={false}>
              Create Order
            </NavLink>
          </li>
          <li>
            <NavLink to="/cashier/orders" className={linkClass} end>
              Orders
            </NavLink>
          </li>
        </>
      )}
    </ul>
  );

  return (
    <>
      <div
        className="offcanvas offcanvas-start app-sidebar-offcanvas d-xl-none"
        tabIndex={-1}
        id="appSidebar"
      >
        <div className="offcanvas-header border-bottom app-sidebar-offcanvas-border">
          <h5 className="offcanvas-title app-sidebar-logo">HITOAN</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
          />
        </div>
        <div className="offcanvas-body d-flex flex-column">{navItems}</div>
      </div>

      <aside className="d-none d-xl-flex flex-column app-sidebar p-3 text-white">
        <h5 className="app-sidebar-logo mb-3">HITOAN</h5>
        {navItems}
      </aside>
    </>
  );
}
