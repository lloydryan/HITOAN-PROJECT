interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  userName?: string;
  loading?: boolean;
}

function LogoutIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  loading = false,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="logout-modal-root">
      <div
        className="logout-modal-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      />
      <div className="logout-modal-wrap" role="document">
        <div className="logout-modal-content">
          <div className="logout-modal-icon">
            <LogoutIcon />
          </div>
          <h3 id="logout-modal-title" className="logout-modal-title">
            Log out?
          </h3>
          <p className="logout-modal-text">
            {userName ? (
              <>
                <strong>{userName}</strong>, are you sure you want to sign out? You'll need to sign in again to continue.
              </>
            ) : (
              "Are you sure you want to sign out? You'll need to sign in again to continue."
            )}
          </p>
          <div className="logout-modal-actions">
            <button
              type="button"
              className="logout-modal-btn logout-modal-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="logout-modal-btn logout-modal-btn-confirm"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Signing out…" : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
