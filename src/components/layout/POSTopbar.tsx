import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePosHeader } from "../../contexts/PosHeaderContext";
import { isDemoMode } from "../../firebase";

export default function POSTopbar() {
  const { user, logout } = useAuth();
  const { search, setSearch } = usePosHeader();
  const isCashier = user?.role === "cashier";
  const settingsLink = isCashier ? "/cashier/orders" : "/crew/orders";

  return (
    <header className="pos-header">
      <div className="pos-header-inner">
        <div className="pos-header-brand-block">
          <Link to={settingsLink} className="pos-header-logo" aria-label="HITOAN POS">
            <span className="pos-header-logo-icon" aria-hidden>●</span>
            <span className="pos-header-brand">HITOAN POS</span>
          </Link>
        </div>

        <div className="pos-header-search-block">
          <label className="pos-header-search-label" htmlFor="pos-search">Search Menu</label>
          <div className="pos-header-search">
            <span className="pos-header-search-icon" aria-hidden>🔍</span>
            <input
              id="pos-search"
              type="search"
              className="pos-header-search-input"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search menu"
            />
          </div>
        </div>

        <div className="pos-header-center">
          <span className="pos-header-order-badge">New Order</span>
          {isDemoMode && (
            <span className="pos-header-demo-badge" title="Running without Firebase – data is not saved">
              Demo
            </span>
          )}
        </div>

        <div className="pos-header-user-block">
          <div className="pos-header-user-info">
            <span className="pos-header-user-label">
              {isCashier ? "Cashier" : user?.role === "crew" ? "Crew" : user?.role === "kitchen" ? "Kitchen" : "Admin"}:
            </span>
            <span className="pos-header-user-name">{user?.displayName}</span>
          </div>
          <button type="button" className="pos-header-btn pos-header-logout" onClick={logout} title="Logout">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
