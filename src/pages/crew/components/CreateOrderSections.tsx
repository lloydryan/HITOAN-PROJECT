import { ClipboardEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBowlFood,
  faCheese,
  faClipboardList,
  faCookieBite,
  faFish,
  faGlassWater,
  faIceCream,
  faShrimp,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { AppUser, MenuItem } from "../../../types";
import { currency } from "../../../utils/format";
import { getVatLabel } from "../../../utils/orderPricing";

/* Category icon map (Font Awesome) */
const CATEGORY_ICON: Record<string, IconDefinition> = {
  all: faClipboardList,
  "hito specials": faFish,
  meals: faUtensils,
  "main dish": faUtensils,
  drinks: faGlassWater,
  beverage: faGlassWater,
  beverages: faGlassWater,
  sides: faCheese,
  desserts: faIceCream,
  rice: faBowlFood,
  seafood: faShrimp,
  appetizer: faCookieBite,
};

function getCategoryIcon(cat: string) {
  return CATEGORY_ICON[cat.trim().toLowerCase()] ?? faClipboardList;
}

/* Quick Add - common items by name (partial match) */
const QUICK_ADD_NAMES = ["Plain Rice", "Coke", "Extra Sauce", "Sprite"];

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
  onQtyChange: (itemId: string, qty: number) => void;
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
  onQtyChange,
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
      {/* Category sidebar - vertical navigation */}
      <aside className="pos-categories-panel">
        <h6 className="pos-categories-title">Category</h6>
        <nav className="pos-categories-nav" aria-label="Filter by category">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className={`pos-category-btn ${category === value ? "pos-category-active" : ""}`}
              onClick={() => onCategoryChange(value)}
              aria-pressed={category === value}
              aria-label={`Filter: ${value === "all" ? "All" : value}`}
            >
              <span className="pos-category-icon" aria-hidden="true">
                <FontAwesomeIcon icon={getCategoryIcon(value)} />
              </span>
              <span className="pos-category-label">{value === "all" ? "All" : value}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section className="pos-menu-panel">
        {/* Quick Add */}
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
                  <span>+ {item.name}</span>
                  <span className="pos-quick-add-price">{currency(item.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.25}
                          className="pos-product-qty-input"
                          value={itemQty}
                          onChange={(e) => {
                            e.stopPropagation();
                            onQtyChange(item.id, Math.max(0, parseFloat(e.target.value) || 0));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          placeholder="0"
                          aria-label={`${item.name} quantity – type or use +/−`}
                        />
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
      </section>
    </div>
  );
}

interface OrderItemsModalProps {
  selectedLines: SelectedLine[];
  subtotal: number;
  tax: number;
  total: number;
  vatEnabled: boolean;
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
  vatEnabled,
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
                          step={line.item.category === "Main Dish" ? 0.25 : 1}
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
                    <span>{getVatLabel(vatEnabled)}</span>
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
  vatEnabled: boolean;
  submitting: boolean;
  validatedCrew: AppUser | null;
  onTypeChange: (value: "dine-in" | "takeout") => void;
  onTableNumberChange: (value: string) => void;
  onVatEnabledChange: (value: boolean) => void;
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
  vatEnabled,
  submitting,
  validatedCrew,
  onTypeChange,
  onTableNumberChange,
  onVatEnabledChange,
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

        <div className={`pos-cart-section ${type === "takeout" ? "pos-cart-section-single" : ""}`}>
        {type === "dine-in" && (
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
        )}
        <div className="pos-cart-field pos-cart-type-dropdown">
          <label className="pos-cart-label">Type</label>
          <div className="dropdown" data-bs-display="static">
            <button
              type="button"
              className="form-select pos-cart-input pos-cart-select pos-cart-type-btn text-start d-flex align-items-center"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-haspopup="listbox"
              aria-label="Order type"
            >
              {type === "dine-in" ? "Dine-in" : "Takeout"}
            </button>
            <ul className="dropdown-menu pos-cart-type-menu" role="listbox">
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  role="option"
                  aria-selected={type === "dine-in"}
                  onClick={() => onTypeChange("dine-in")}
                >
                  Dine-in
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  role="option"
                  aria-selected={type === "takeout"}
                  onClick={() => onTypeChange("takeout")}
                >
                  Takeout
                </button>
              </li>
            </ul>
          </div>
        </div>
        </div>

        <label className="pos-cart-vat-toggle" htmlFor="posVatToggle">
          <span className="pos-cart-label">Add VAT (12%)</span>
          <input
            id="posVatToggle"
            type="checkbox"
            checked={vatEnabled}
            onChange={(e) => onVatEnabledChange(e.target.checked)}
          />
        </label>

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
          <span>{getVatLabel(vatEnabled)}</span>
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
        vatEnabled={vatEnabled}
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

