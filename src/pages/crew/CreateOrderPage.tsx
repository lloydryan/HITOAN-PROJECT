import { useEffect, useMemo, useState } from "react";
import { AppUser, MenuItem } from "../../types";
import { getMenuItems } from "../../services/menuService";
import { createOrder } from "../../services/orderService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { currency } from "../../utils/format";
import { validateCrewByEmployeeId } from "../../services/userService";

type QtyMap = Record<string, number>;

export default function CreateOrderPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [type, setType] = useState<"dine-in" | "takeout">("dine-in");
  const [tableNumber, setTableNumber] = useState("");
  const [qty, setQty] = useState<QtyMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [crewIdInput, setCrewIdInput] = useState("");
  const [validatedCrew, setValidatedCrew] = useState<AppUser | null>(null);
  const [validatingCrew, setValidatingCrew] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [step, setStep] = useState<"menu" | "review">("menu");
  const [pressTimer, setPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [longPressItemId, setLongPressItemId] = useState<string | null>(null);

  useEffect(() => {
    getMenuItems()
      .then((data) => setMenu(data.filter((m) => m.isAvailable)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(menu.map((m) => m.category)))],
    [menu],
  );

  const displayedMenu = useMemo(
    () =>
      category === "all" ? menu : menu.filter((m) => m.category === category),
    [menu, category],
  );

  const selectedLines = useMemo(
    () =>
      menu
        .map((m) => ({ item: m, qty: qty[m.id] || 0 }))
        .filter((x) => qty[x.item.id] !== undefined),
    [menu, qty],
  );

  const subtotal = useMemo(
    () =>
      selectedLines.reduce(
        (sum, line) => sum + line.item.price * Math.max(0, line.qty),
        0,
      ),
    [selectedLines],
  );

  const tax = Number((subtotal * 0.12).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  const validateCrew = async () => {
    if (!crewIdInput.trim()) {
      showToast("Validation", "Enter employee ID first", "warning");
      return;
    }

    setValidatingCrew(true);
    try {
      const crew = await validateCrewByEmployeeId(crewIdInput.trim());
      if (!crew) {
        setValidatedCrew(null);
        showToast("Invalid ID", "Crew employee ID not found", "danger");
        return;
      }
      setValidatedCrew(crew);
      showToast("Verified", `${crew.displayName} is valid.`);
    } catch (e) {
      setValidatedCrew(null);
      const err = e as { code?: string; message?: string };
      if (err.code === "permission-denied") {
        showToast(
          "Validation failed",
          "Permission denied. Publish latest Firestore rules, then retry.",
          "danger",
        );
      } else {
        showToast(
          "Validation failed",
          err.message || "Unexpected error",
          "danger",
        );
      }
    } finally {
      setValidatingCrew(false);
    }
  };

  const addMenuItem = (item: MenuItem) => {
    if (!validatedCrew) {
      showToast("Crew required", "Validate crew employee ID first", "warning");
      return;
    }
    setQty((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  };

  const removeMenuItem = (itemId: string) => {
    setQty((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const startLongPress = (itemId: string) => {
    const timer = setTimeout(() => {
      removeMenuItem(itemId);
      setLongPressItemId(itemId);
      setPressTimer(null);
      showToast("Removed", "Item unselected");
    }, 550);
    setPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (longPressItemId === item.id) {
      setLongPressItemId(null);
      return;
    }
    addMenuItem(item);
  };

  const setItemQty = (itemId: string, next: number) => {
    const value = Math.max(0, Number(next.toFixed(2)));
    setQty((prev) => ({ ...prev, [itemId]: value }));
  };

  const submit = async () => {
    if (!user) return;
    if (!validatedCrew) {
      showToast(
        "Validation",
        "Validate crew employee ID before creating order",
        "warning",
      );
      return;
    }
    if (!selectedLines.some((line) => line.qty > 0)) {
      showToast(
        "Validation",
        "Set at least one item quantity greater than 0",
        "warning",
      );
      return;
    }
    if (!tableNumber.trim()) {
      showToast(
        "Validation",
        "Enter table number before creating order",
        "warning",
      );
      return;
    }

    setSubmitting(true);
    try {
      await createOrder(
        user,
        type,
        selectedLines,
        {
          uid: validatedCrew.id,
          employeeId: validatedCrew.employeeId || crewIdInput.trim(),
          displayName: validatedCrew.displayName,
        },
        tableNumber.trim(),
      );
      showToast("Success", "Order created");
      setQty({});
      setType("dine-in");
      setTableNumber("");
      setCrewIdInput("");
      setValidatedCrew(null);
      setStep("menu");
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner-border text-primary" />;

  return (
    <>
      {!validatedCrew ? (
        <>
          <div
            className="modal d-block"
            tabIndex={-1}
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
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
                    onChange={(e) => setCrewIdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") validateCrew();
                    }}
                  />
                  <p className="small text-muted mt-2 mb-0">
                    Validate crew first to continue ordering.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-primary"
                    onClick={validateCrew}
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
      ) : null}

      <div className="row g-3">
        <div className={step === "review" ? "col-lg-8" : "col-12"}>
          <span className="badge bg-success mb-2">
            Crew: {validatedCrew?.displayName} (
            {validatedCrew?.employeeId || crewIdInput})
          </span>
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="mb-0">
                  {step === "menu" ? "Select Menu Items" : "Selected Items"}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <input
                    className="form-control"
                    style={{ width: 160 }}
                    placeholder="Table #"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                  <select
                    className="form-select"
                    style={{ width: 180 }}
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as "dine-in" | "takeout")
                    }
                  >
                    <option value="dine-in">Dine-in</option>
                    <option value="takeout">Takeout</option>
                  </select>
                </div>
              </div>

              {step === "menu" ? (
                <>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {categories.map((c) => (
                      <button
                        key={c}
                        className={`btn btn-sm ${category === c ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setCategory(c)}
                        type="button"
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="row g-2">
                    {displayedMenu.map((item) => (
                      <div className="col-12 col-md-6 col-xl-4" key={item.id}>
                        <button
                          type="button"
                          className={`btn w-100 text-start p-3 h-100 menu-item-btn ${
                            (qty[item.id] || 0) > 0
                              ? "menu-item-selected"
                              : "btn-outline-dark"
                          }`}
                          onClick={() => handleMenuItemClick(item)}
                          onMouseDown={() =>
                            (qty[item.id] || 0) > 0 && startLongPress(item.id)
                          }
                          onMouseUp={cancelLongPress}
                          onMouseLeave={cancelLongPress}
                          onTouchStart={() =>
                            (qty[item.id] || 0) > 0 && startLongPress(item.id)
                          }
                          onTouchEnd={cancelLongPress}
                          title="Click to add. Long press to unselect."
                        >
                          <div className="fw-semibold">{item.name}</div>
                          <div className="small opacity-75">
                            {item.category}
                          </div>
                          <div className="mt-1 d-flex justify-content-between align-items-center">
                            <span>{currency(item.price)}</span>
                            {(qty[item.id] || 0) > 0 ? (
                              <span className="badge bg-light text-dark">
                                Selected: {qty[item.id]}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button
                      className="btn btn-primary"
                      disabled={selectedLines.length === 0}
                      onClick={() => setStep("review")}
                    >
                      Proceed
                    </button>
                  </div>
                </>
              ) : (
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
                            <td
                              colSpan={5}
                              className="text-center text-muted py-3"
                            >
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
                                  onChange={(e) =>
                                    setItemQty(
                                      line.item.id,
                                      Number(e.target.value) || 0,
                                    )
                                  }
                                />
                              </td>
                              <td className="text-end">
                                {currency(line.item.price * line.qty)}
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeMenuItem(line.item.id)}
                                >
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
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setStep("menu")}
                    >
                      Back to Menu
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={submit}
                      disabled={submitting || !validatedCrew}
                    >
                      {submitting ? "Creating..." : "Submit Order"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {step === "review" ? (
          <div className="col-lg-4">
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
          </div>
        ) : null}
      </div>
    </>
  );
}
