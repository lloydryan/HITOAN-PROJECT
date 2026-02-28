import { ClipboardEvent, KeyboardEvent, useRef } from "react";
import { AppUser, MenuItem } from "../../../types";
import { currency } from "../../../utils/format";

export interface SelectedLine {
  item: MenuItem;
  qty: number;
}

interface CrewVerificationModalProps {
  crewIdInput: string;
  validatingCrew: boolean;
  onCrewIdInputChange: (value: string) => void;
  onValidate: () => void;
}

export function CrewVerificationModal({
  crewIdInput,
  validatingCrew,
  onCrewIdInputChange,
  onValidate
}: CrewVerificationModalProps) {
  const codeLength = 4;
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: codeLength }, (_, idx) =>
    crewIdInput[idx] || "",
  );

  const updateDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    onCrewIdInputChange(next.join(""));
    if (digit && index < codeLength - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onValidate();
      return;
    }
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && index < codeLength - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, codeLength);
    if (!pasted) return;
    onCrewIdInputChange(pasted);
    refs.current[Math.min(pasted.length, codeLength) - 1]?.focus();
  };

  return (
    <>
      <div
        className="modal d-block crew-order-modal"
        tabIndex={-1}
        style={{ background: "rgba(7, 13, 22, 0.55)" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content crew-order-modal-content">
            <div className="modal-header crew-order-modal-header border-0">
              <div className="crew-order-modal-title-wrap">
                <div className="crew-order-modal-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h5 className="modal-title mb-0">Crew Verification</h5>
                  <p className="crew-order-modal-subtitle mb-0">
                    Verify your employee ID before creating orders.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <label className="form-label crew-order-modal-label">Employee Code</label>
              <div className="crew-order-code-grid">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      refs.current[idx] = el;
                    }}
                    className="form-control crew-order-code-cell"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => updateDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    aria-label={`Code digit ${idx + 1}`}
                  />
                ))}
              </div>
              <p className="small text-muted mt-2 mb-0 crew-order-modal-note">
                This keeps ordering secure and linked to the correct crew profile.
              </p>
            </div>
            <div className="modal-footer crew-order-modal-footer">
              <button
                className="btn btn-primary crew-order-btn-primary w-100"
                onClick={onValidate}
                disabled={validatingCrew}
              >
                {validatingCrew ? "Checking..." : "Validate ID"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

interface MenuSelectionViewProps {
  categories: string[];
  category: string;
  displayedMenu: MenuItem[];
  menuSearch: string;
  qty: Record<string, number>;
  onCategoryChange: (value: string) => void;
  onMenuSearchChange: (value: string) => void;
  onItemClick: (item: MenuItem) => void;
  onItemLongPressStart: (itemId: string) => void;
  onItemLongPressCancel: () => void;
}

export function MenuSelectionView({
  categories,
  category,
  displayedMenu,
  menuSearch,
  qty,
  onCategoryChange,
  onMenuSearchChange,
  onItemClick,
  onItemLongPressStart,
  onItemLongPressCancel
}: MenuSelectionViewProps) {
  return (
    <>
      <div className="crew-order-search-wrap mb-3">
        <input
          className="form-control crew-order-input crew-order-search-input"
          placeholder="Search menu here"
          value={menuSearch}
          onChange={(e) => onMenuSearchChange(e.target.value)}
        />
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {categories.map((value) => (
          <button
            key={value}
            className={`btn btn-sm crew-order-chip ${category === value ? "crew-order-chip-active" : "crew-order-chip-idle"}`}
            onClick={() => onCategoryChange(value)}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>

      <div className="row g-2">
        {displayedMenu.map((item) => (
          <div className="col-12 col-md-6 col-xl-4" key={item.id}>
            <button
              type="button"
              className={`btn w-100 text-start p-3 h-100 menu-item-btn crew-order-item-btn ${
                (qty[item.id] || 0) > 0 ? "menu-item-selected crew-order-item-selected" : "crew-order-item-idle"
              }`}
              onClick={() => onItemClick(item)}
              onMouseDown={() => (qty[item.id] || 0) > 0 && onItemLongPressStart(item.id)}
              onMouseUp={onItemLongPressCancel}
              onMouseLeave={onItemLongPressCancel}
              onTouchStart={() => (qty[item.id] || 0) > 0 && onItemLongPressStart(item.id)}
              onTouchEnd={onItemLongPressCancel}
              title="Click to add. Long press to unselect."
            >
              <div className="fw-semibold">{item.name}</div>
              <div className="small opacity-75 text-uppercase">{item.category}</div>
              <div className="mt-1 d-flex justify-content-between align-items-center">
                <span>{currency(item.price)}</span>
                {(qty[item.id] || 0) > 0 ? (
                  <span className="badge crew-order-selected-badge">Selected: {qty[item.id]}</span>
                ) : null}
              </div>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

interface OrderSidePanelProps {
  selectedLines: SelectedLine[];
  type: "dine-in" | "takeout";
  tableNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  submitting: boolean;
  validatedCrew: AppUser | null;
  onTypeChange: (value: "dine-in" | "takeout") => void;
  onTableNumberChange: (value: string) => void;
  onQtyChange: (itemId: string, next: number) => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onSubmit: () => void;
}

export function OrderSidePanel({
  selectedLines,
  type,
  tableNumber,
  subtotal,
  tax,
  total,
  submitting,
  validatedCrew,
  onTypeChange,
  onTableNumberChange,
  onQtyChange,
  onIncrease,
  onDecrease,
  onRemove,
  onSubmit
}: OrderSidePanelProps) {
  return (
    <div className="card sticky-top crew-order-right-card" style={{ top: 80 }}>
      <div className="card-body">
        <h6 className="crew-order-right-title mb-3">Your Order</h6>

        <div className="d-flex align-items-center gap-2 mb-2">
          <input
            className="form-control form-control-sm crew-order-input"
            placeholder="Table #"
            value={tableNumber}
            onChange={(e) => onTableNumberChange(e.target.value)}
          />
          <select
            className="form-select form-select-sm crew-order-input"
            value={type}
            onChange={(e) => onTypeChange(e.target.value as "dine-in" | "takeout")}
          >
            <option value="dine-in">Dine-in</option>
            <option value="takeout">Takeout</option>
          </select>
        </div>

        <div className="crew-order-right-items">
          {selectedLines.length === 0 ? (
            <div className="text-muted small py-3 text-center">
              No items selected yet.
            </div>
          ) : (
            selectedLines.map((line) => (
              <div className="crew-order-right-line" key={line.item.id}>
                <div className="crew-order-right-line-meta">
                  <div className="fw-semibold">{line.item.name}</div>
                  <div className="small text-muted mb-1">{currency(line.item.price)}</div>
                  <div className="crew-order-right-controls">
                    <div className="crew-order-qty-group">
                      <button
                        type="button"
                        className="btn btn-sm crew-order-qty-btn"
                        onClick={() => onDecrease(line.item.id)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="form-control form-control-sm crew-order-qty-input"
                        value={line.qty}
                        onChange={(e) =>
                          onQtyChange(line.item.id, Number(e.target.value) || 0)
                        }
                        aria-label={`${line.item.name} quantity in kilograms`}
                      />
                      <button
                        type="button"
                        className="btn btn-sm crew-order-qty-btn"
                        onClick={() => onIncrease(line.item.id)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link crew-order-remove-link"
                      onClick={() => onRemove(line.item.id)}
                      aria-label={`Remove ${line.item.name}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ display: "block" }}
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3">
          <h6 className="mb-2">Payment Summary</h6>
          <div className="d-flex justify-content-between small">
            <span>Subtotal</span>
            <strong>{currency(subtotal)}</strong>
          </div>
          <div className="d-flex justify-content-between small">
            <span>Tax</span>
            <strong>{currency(tax)}</strong>
          </div>
          <div className="d-flex justify-content-between mt-1">
            <span>Total</span>
            <strong>{currency(total)}</strong>
          </div>
        </div>

        <button
          className="btn btn-primary crew-order-btn-primary w-100 mt-3"
          onClick={onSubmit}
          disabled={
            submitting ||
            !validatedCrew ||
            !selectedLines.some((line) => line.qty > 0)
          }
        >
          {submitting ? "Creating..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

interface OrderSummaryCardProps {
  subtotal: number;
  tax: number;
  total: number;
}

export function OrderSummaryCard({ subtotal, tax, total }: OrderSummaryCardProps) {
  return (
    <div className="card sticky-top crew-order-summary-card" style={{ top: 80 }}>
      <div className="card-body">
        <h6>Order Summary</h6>
        <div className="d-flex justify-content-between">
          <span>Subtotal</span>
          <span>{currency(subtotal)}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span>Tax (12%)</span>
          <span>{currency(tax)}</span>
        </div>
        <hr />
        <div className="d-flex justify-content-between fw-bold">
          <span>Total</span>
          <span>{currency(total)}</span>
        </div>
      </div>
    </div>
  );
}
