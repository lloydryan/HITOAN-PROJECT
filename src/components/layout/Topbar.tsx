import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import LogoutConfirmModal from "../common/LogoutConfirmModal";

export default function Topbar() {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <nav className="navbar navbar-light bg-white border-bottom px-3 py-2 app-topbar w-100 flex-wrap gap-2 align-items-center">
      <button
        className="btn btn-outline-secondary d-xl-none flex-shrink-0"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#appSidebar"
        aria-label="Open navigation menu"
      >
        Menu
      </button>
      <div className="ms-auto d-flex align-items-center gap-2 gap-sm-3 flex-wrap justify-content-end app-topbar-end">
        <div className="text-end app-topbar-user text-truncate">
          <div className="small fw-semibold text-dark text-truncate">{user?.displayName}</div>
          <div className="small text-muted text-capitalize">{user?.role}</div>
        </div>
        <button className="btn btn-sm pos-logout-link" onClick={() => setShowLogoutModal(true)}>
          Logout
        </button>
        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={async () => {
            await logout();
            setShowLogoutModal(false);
          }}
          userName={user?.displayName}
        />
      </div>
    </nav>
  );
}
