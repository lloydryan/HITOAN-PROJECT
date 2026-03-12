import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePosHeader } from "../../contexts/PosHeaderContext";

export default function POSTopbar() {
  const { user, logout } = useAuth();
  const { search, setSearch } = usePosHeader();
  const isCashier = user?.role === "cashier";
  const homeLink = isCashier ? "/cashier/orders" : "/crew/orders";

  return (
    <header className="pos-header">
      <div className="pos-header-inner">
        <Link to={homeLink} className="pos-header-logo" aria-label="HITOAN POS">
          <img src="/logo.jpg" alt="HITOAN POS" className="pos-header-logo-img" />
        </Link>

        <div className="pos-header-search-block">
          <input
            id="pos-search"
            type="search"
            className="pos-header-search-input"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search menu"
          />
        </div>

        <div className="pos-header-actions">
          <span className="pos-header-user-name">{user?.displayName}</span>
          <button type="button" className="pos-header-btn pos-header-logout" onClick={logout} title="Logout">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
