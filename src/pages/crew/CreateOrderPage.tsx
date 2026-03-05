import { useEffect, useMemo, useState } from "react";
import { AppUser, MenuItem } from "../../types";
import { getMenuItems } from "../../services/menuService";
import { createOrder } from "../../services/orderService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { validateCrewByEmployeeId } from "../../services/userService";
import {
  CrewVerificationModal,
  MenuSelectionView,
  OrderSidePanel,
} from "./components/CreateOrderSections";

type QtyMap = Record<string, number>;

export default function CreateOrderPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isCashier = user?.role === "cashier";
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
  const [menuSearch, setMenuSearch] = useState("");
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
    if (isCashier && user) {
      setValidatedCrew(user);
      return;
    }
    setValidatedCrew(null);
  }, [isCashier, user]);

  useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(menu.map((m) => m.category)))],
    [menu],
  );

  const displayedMenu = useMemo(() => {
    const base =
      category === "all" ? menu : menu.filter((m) => m.category === category);
    const key = menuSearch.trim().toLowerCase();
    if (!key) return base;
    return base.filter(
      (m) =>
        m.name.toLowerCase().includes(key) ||
        m.category.toLowerCase().includes(key),
    );
  }, [menu, category, menuSearch]);

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
      showToast(
        "Validation required",
        isCashier ? "Cashier profile not loaded yet" : "Validate crew employee ID first",
        "warning",
      );
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

  const increaseItemQty = (itemId: string) => {
    setItemQty(itemId, (qty[itemId] || 0) + 0.25);
  };

  const decreaseItemQty = (itemId: string) => {
    const current = qty[itemId] || 0;
    if (current <= 0.25) {
      removeMenuItem(itemId);
      return;
    }
    setItemQty(itemId, current - 0.25);
  };

  const submit = async () => {
    if (!user) return;
    if (!validatedCrew) {
      showToast(
        "Validation",
        isCashier
          ? "Unable to load cashier profile for this order"
          : "Validate crew employee ID before creating order",
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
          employeeId: validatedCrew.employeeId || crewIdInput.trim() || validatedCrew.id,
          displayName: validatedCrew.displayName,
        },
        tableNumber.trim(),
        isCashier
          ? {
              initialStatus: "ready",
              actorUid: user.id,
              actorRole: "cashier",
              actorName: `${user.displayName}${user.employeeId ? ` [${user.employeeId}]` : ""}`,
              message: `Cashier created ready order (${user.employeeId || user.id})`,
              metadata: {
                createdByRole: "cashier",
              },
            }
          : undefined,
      );
      showToast("Success", "Order created");
      setQty({});
      setType("dine-in");
      setTableNumber("");
      setCrewIdInput("");
      if (!isCashier) setValidatedCrew(null);
      setMenuSearch("");
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner-border text-primary" />;

  return (
    <>
      {!isCashier && !validatedCrew ? (
        <CrewVerificationModal
          crewIdInput={crewIdInput}
          validatingCrew={validatingCrew}
          onCrewIdInputChange={setCrewIdInput}
          onValidate={validateCrew}
        />
      ) : null}

      <div className="row g-3 crew-order-page">
        <div className="col-md-8">
          <div className="card crew-order-main-card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 crew-order-toolbar">
                <h5 className="mb-0 crew-order-title">Select Menu Items</h5>
              </div>

              <MenuSelectionView
                categories={categories}
                category={category}
                displayedMenu={displayedMenu}
                menuSearch={menuSearch}
                qty={qty}
                onCategoryChange={setCategory}
                onMenuSearchChange={setMenuSearch}
                onItemClick={handleMenuItemClick}
                onItemLongPressStart={startLongPress}
                onItemLongPressCancel={cancelLongPress}
              />
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <OrderSidePanel
            selectedLines={selectedLines}
            type={type}
            tableNumber={tableNumber}
            subtotal={subtotal}
            tax={tax}
            total={total}
            submitting={submitting}
            validatedCrew={validatedCrew}
            onTypeChange={setType}
            onTableNumberChange={setTableNumber}
            onQtyChange={setItemQty}
            onIncrease={increaseItemQty}
            onDecrease={decreaseItemQty}
            onRemove={removeMenuItem}
            onSubmit={submit}
          />
        </div>
      </div>
    </>
  );
}
