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
  return (
    <>
      <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Crew Verification</h5>
            </div>
            <div className="modal-body">
              <label className="form-label">Employee ID</label>
              <input
                className="form-control"
                placeholder="Enter crew employee ID"
                value={crewIdInput}
                onChange={(e) => onCrewIdInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onValidate();
                }}
              />
              <p className="small text-muted mt-2 mb-0">Validate crew first to continue ordering.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onValidate} disabled={validatingCrew}>
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
  qty: Record<string, number>;
  selectedLinesCount: number;
  onCategoryChange: (value: string) => void;
  onItemClick: (item: MenuItem) => void;
  onItemLongPressStart: (itemId: string) => void;
  onItemLongPressCancel: () => void;
  onProceed: () => void;
}

export function MenuSelectionView({
  categories,
  category,
  displayedMenu,
  qty,
  selectedLinesCount,
  onCategoryChange,
  onItemClick,
  onItemLongPressStart,
  onItemLongPressCancel,
  onProceed
}: MenuSelectionViewProps) {
  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {categories.map((value) => (
          <button
            key={value}
            className={`btn btn-sm ${category === value ? "btn-primary" : "btn-outline-secondary"}`}
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
              className={`btn w-100 text-start p-3 h-100 menu-item-btn ${
                (qty[item.id] || 0) > 0 ? "menu-item-selected" : "btn-outline-dark"
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
              <div className="small opacity-75">{item.category}</div>
              <div className="mt-1 d-flex justify-content-between align-items-center">
                <span>{currency(item.price)}</span>
                {(qty[item.id] || 0) > 0 ? <span className="badge bg-light text-dark">Selected: {qty[item.id]}</span> : null}
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-end mt-4">
        <button className="btn btn-primary" disabled={selectedLinesCount === 0} onClick={onProceed}>
          Proceed
        </button>
      </div>
    </>
  );
}

interface SelectedItemsReviewViewProps {
  selectedLines: SelectedLine[];
  submitting: boolean;
  validatedCrew: AppUser | null;
  onQtyChange: (itemId: string, next: number) => void;
  onRemove: (itemId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function SelectedItemsReviewView({
  selectedLines,
  submitting,
  validatedCrew,
  onQtyChange,
  onRemove,
  onBack,
  onSubmit
}: SelectedItemsReviewViewProps) {
  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th style={{ width: 150 }}>Qty (kg)</th>
              <th className="text-end">Subtotal</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {selectedLines.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  No items selected.
                </td>
              </tr>
            ) : (
              selectedLines.map((line) => (
                <tr key={line.item.id}>
                  <td>{line.item.name}</td>
                  <td>{currency(line.item.price)}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="form-control form-control-sm"
                      value={line.qty}
                      onChange={(e) => onQtyChange(line.item.id, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td className="text-end">{currency(line.item.price * line.qty)}</td>
                  <td className="text-end">
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRemove(line.item.id)}>
                      X
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between mt-3">
        <button className="btn btn-outline-secondary" onClick={onBack}>
          Back to Menu
        </button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={submitting || !validatedCrew}>
          {submitting ? "Creating..." : "Submit Order"}
        </button>
      </div>
    </>
  );
}

interface OrderSummaryCardProps {
  subtotal: number;
  tax: number;
  total: number;
}

export function OrderSummaryCard({ subtotal, tax, total }: OrderSummaryCardProps) {
  return (
    <div className="card sticky-top" style={{ top: 80 }}>
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
