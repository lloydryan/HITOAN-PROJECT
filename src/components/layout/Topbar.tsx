import { useAuth } from "../../hooks/useAuth";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar navbar-light bg-white border-bottom px-3 py-2 app-topbar">
      <button
        className="btn btn-outline-secondary d-lg-none"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#appSidebar"
      >
        Menu
      </button>
      <div className="ms-auto d-flex align-items-center gap-3">
        <div className="text-end">
          <div className="small fw-semibold text-dark">{user?.displayName}</div>
          <div className="small text-muted text-capitalize">{user?.role}</div>
        </div>
        <button className="btn btn-sm btn-danger" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
