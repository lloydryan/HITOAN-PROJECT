import { ClipboardEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { AppUser, MenuItem } from "../../../types";
import { currency } from "../../../utils/format";

/* Category emoji map */
const CATEGORY_EMOJI: Record<string, string> = {
  all: "📋",
  "Hito Specials": "🐟",
  Meals: "🍽",
  Drinks: "🥤",
  Sides: "🍟",
  Desserts: "🍰",
  Rice: "🍚",
  Seafood: "🦐",
  Appetizer: "🥟",
};

function getCategoryEmoji(cat: string) {
  return CATEGORY_EMOJI[cat] ?? "📌";
}

/* Quick Add - common items by name (partial match) */
const QUICK_ADD_NAMES = ["Rice", "Coke", "Extra Sauce", "Sprite"];

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
        className="modal d-block pos-modal-backdrop"
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content pos-modal-content">
            <div className="modal-header pos-modal-header border-0">
              <div className="pos-modal-title-wrap">
                <div className="pos-modal-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h5 className="modal-title mb-0">Crew Verification</h5>
                  <p className="pos-modal-subtitle mb-0">Verify your employee ID before creating orders.</p>
                </div>
              </div>
            </div>
            <div className="modal-body pos-modal-body">
              <label className="form-label pos-modal-label">Employee Code</label>
              <div className="pos-code-grid">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { refs.current[idx] = el; }}
                    className="form-control pos-code-cell"
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
              <p className="small text-muted mt-2 mb-0">This keeps ordering secure and linked to the correct crew profile.</p>
            </div>
            <div className="modal-footer pos-modal-footer">
              <button
                className="btn pos-btn-primary w-100"
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
  menu: MenuItem[];
  qty: Record<string, number>;
  onCategoryChange: (value: string) => void;
  onItemClick: (item: MenuItem) => void;
  addMenuItem: (item: MenuItem) => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  validatedCrew: AppUser | null;
}

export function MenuSelectionView({
  categories,
  category,
  displayedMenu,
  menu,
  qty,
  onCategoryChange,
  onItemClick,
  addMenuItem,
  onIncrease,
  onDecrease,
  validatedCrew,
}: MenuSelectionViewProps) {
  const quickAddItems = useMemo(() => {
    return QUICK_ADD_NAMES.map((name) => {
      const found = menu.find(
        (m) => m.name.toLowerCase().includes(name.toLowerCase())
      );
      return found ?? null;
    }).filter(Boolean) as MenuItem[];
  }, [menu]);

  return (
    <div className="pos-columns">
      {/* Categories - 20% */}
      <aside className="pos-categories-panel">
        <h6 className="pos-categories-title">Categories</h6>
        <nav className="pos-categories-nav">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className={`pos-category-btn ${category === value ? "pos-category-active" : ""}`}
              onClick={() => onCategoryChange(value)}
            >
              <span className="pos-category-emoji">{getCategoryEmoji(value)}</span>
              <span className="pos-category-label">{value === "all" ? "All" : value}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Menu Grid - 50% */}
      <section className="pos-menu-panel">
        <div className="pos-menu-grid">
          {displayedMenu.map((item) => {
            const itemQty = qty[item.id] || 0;
            const isAdded = itemQty > 0;
            return (
              <div
                key={item.id}
                className={`pos-product-card ${isAdded ? "pos-product-card-added" : ""}`}
              >
                <div className="pos-product-card-body">
                  <div className="pos-product-name">{item.name}</div>
                  <div className="pos-product-desc">Category: {item.category}</div>
                  <div className="pos-product-price">{currency(item.price)}</div>
                  {isAdded ? (
                    <div className="pos-product-qty-controls">
                      <span className="pos-product-added-badge">Added ✓</span>
                      <div className="pos-product-qty-group">
                        <button
                          type="button"
                          className="pos-product-qty-btn"
                          onClick={(e) => { e.stopPropagation(); onDecrease(item.id); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          aria-label={`Decrease ${item.name}`}
                        >
                          −
                        </button>
                        <span className="pos-product-qty-value">{itemQty}</span>
                        <button
                          type="button"
                          className="pos-product-qty-btn"
                          onClick={(e) => { e.stopPropagation(); onIncrease(item.id); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          aria-label={`Increase ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="pos-product-add-btn"
                      onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                      disabled={!validatedCrew}
                    >
                      Add to Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add - Owner spec */}
        {quickAddItems.length > 0 && (
          <div className="pos-quick-add">
            <h6 className="pos-quick-add-title">Quick Add</h6>
            <div className="pos-quick-add-btns">
              {quickAddItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="pos-quick-add-btn"
                  onClick={() => validatedCrew && addMenuItem(item)}
                  disabled={!validatedCrew}
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface OrderItemsModalProps {
  selectedLines: SelectedLine[];
  subtotal: number;
  tax: number;
  total: number;
  onClose: () => void;
  onQtyChange: (itemId: string, next: number) => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

function OrderItemsModal({
  selectedLines,
  subtotal,
  tax,
  total,
  onClose,
  onQtyChange,
  onIncrease,
  onDecrease,
  onRemove,
}: OrderItemsModalProps) {
  return (
    <div
      className="modal d-block pos-order-items-modal"
      tabIndex={-1}
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered pos-order-items-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content pos-modal-content pos-order-items-content">
          <div className="modal-header pos-modal-header pos-order-items-header border-0">
            <h5 className="modal-title">Order Items</h5>
            <button type="button" className="btn-close pos-order-items-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body pos-order-items-body">
            {selectedLines.length === 0 ? (
              <div className="pos-cart-empty">
                <span className="pos-cart-empty-icon">📋</span>
                <p className="pos-cart-empty-text">No items selected yet.</p>
                <p className="pos-cart-empty-hint">Tap items from the menu to add them.</p>
              </div>
            ) : (
              <div className="pos-order-items-list">
                {selectedLines.map((line) => (
                  <div className="pos-order-item-row" key={line.item.id}>
                    <div className="pos-order-item-info">
                      <div className="pos-order-item-name">{line.item.name}</div>
                      <div className="pos-order-item-price">
                        {currency(line.item.price)} × {line.qty} = <strong>{currency(line.item.price * line.qty)}</strong>
                      </div>
                    </div>
                    <div className="pos-order-item-controls">
                      <div className="pos-qty-group">
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() => onDecrease(line.item.id)}
                          aria-label={`Decrease ${line.item.name} quantity`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="pos-qty-input"
                          value={line.qty}
                          onChange={(e) => onQtyChange(line.item.id, Number(e.target.value) || 0)}
                          aria-label={`${line.item.name} quantity`}
                        />
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() => onIncrease(line.item.id)}
                          aria-label={`Increase ${line.item.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="pos-order-item-remove"
                        onClick={() => onRemove(line.item.id)}
                        title={`Remove ${line.item.name}`}
                        aria-label={`Remove ${line.item.name}`}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pos-order-items-footer">
            {selectedLines.length > 0 ? (
              <>
                <div className="pos-order-items-totals">
                  <div className="pos-order-totals-row">
                    <span>Subtotal</span>
                    <strong>{currency(subtotal)}</strong>
                  </div>
                  <div className="pos-order-totals-row">
                    <span>Tax</span>
                    <strong>{currency(tax)}</strong>
                  </div>
                  <div className="pos-order-totals-row pos-order-totals-total">
                    <span>TOTAL</span>
                    <strong>{currency(total)}</strong>
                  </div>
                </div>
                <div className="pos-order-items-footer-buttons">
                  <button type="button" className="btn pos-btn-back" onClick={onClose}>
                    Back to Order
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-secondary w-100" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
  onClearOrder: () => void;
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
  onClearOrder,
  onSubmit,
}: OrderSidePanelProps) {
  const [showItemsModal, setShowItemsModal] = useState(false);

  return (
    <>
    <aside className="pos-cart-panel">
      <div className="pos-cart-top">
        <h6 className="pos-cart-title">Order Summary</h6>

        <div className="pos-cart-section">
        <div className="pos-cart-field">
          <label className="pos-cart-label">Table</label>
          <input
            className="form-control pos-cart-input"
            placeholder="5"
            value={tableNumber}
            onChange={(e) => onTableNumberChange(e.target.value)}
            aria-label="Table number"
          />
        </div>
        <div className="pos-cart-field">
          <label className="pos-cart-label">Type</label>
          <select
            className="form-select pos-cart-input pos-cart-select"
            value={type}
            onChange={(e) => onTypeChange(e.target.value as "dine-in" | "takeout")}
          >
            <option value="dine-in">Dine-in</option>
            <option value="takeout">Takeout</option>
          </select>
        </div>
        </div>

        <div className="pos-cart-items-header">
          <span className="pos-cart-items-label">Items</span>
        </div>
        <button
          type="button"
          className="pos-cart-show-items-btn"
          onClick={() => setShowItemsModal(true)}
          disabled={selectedLines.length === 0}
        >
          {selectedLines.length === 0
            ? "No items yet"
            : `Show Order (${selectedLines.length} item${selectedLines.length !== 1 ? "s" : ""})`}
        </button>
      </div>

      <div className="pos-cart-bottom">
        <div className="pos-cart-totals">
        <div className="pos-cart-row">
          <span>Subtotal</span>
          <strong>{currency(subtotal)}</strong>
        </div>
        <div className="pos-cart-row">
          <span>Tax</span>
          <strong>{currency(tax)}</strong>
        </div>
        <div className="pos-cart-row pos-cart-total-row">
          <span className="pos-cart-total-label">TOTAL</span>
          <strong className="pos-cart-total-value">{currency(total)}</strong>
        </div>
        </div>

        <div className="pos-cart-actions">
        <button
          className="btn pos-btn-checkout w-100"
          onClick={onSubmit}
          disabled={
            submitting ||
            !validatedCrew ||
            !selectedLines.some((line) => line.qty > 0)
          }
        >
          {submitting ? "Creating..." : "Checkout Order"}
        </button>
        <button
          type="button"
          className="btn pos-btn-cancel w-100"
          onClick={onClearOrder}
          disabled={selectedLines.length === 0}
        >
          Cancel
        </button>
        </div>
      </div>
    </aside>

    {showItemsModal && (
      <OrderItemsModal
        selectedLines={selectedLines}
        subtotal={subtotal}
        tax={tax}
        total={total}
        onClose={() => setShowItemsModal(false)}
        onQtyChange={onQtyChange}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
        onRemove={onRemove}
      />
    )}
    </>
  );
}
