import { useEffect, useMemo, useState } from "react";
import { AppUser, MenuItem, Order } from "../../types";
import { getMenuItems } from "../../services/menuService";
import {
  addNewItemsToOrderByCashier,
  createOrder,
} from "../../services/orderService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { usePosHeader } from "../../contexts/PosHeaderContext";
import { validateCrewByEmployeeId } from "../../services/userService";
import { computeOrderTotals } from "../../utils/orderPricing";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CrewVerificationModal,
  MenuSelectionView,
  OrderSidePanel,
} from "./components/CreateOrderSections";

type QtyMap = Record<string, number>;

export default function CreateOrderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { search: menuSearch } = usePosHeader();
  const isCashier = user?.role === "cashier";
  const routeState = location.state as
    | { mode?: "add-items"; order?: Order }
    | undefined;
  const addModeOrder = routeState?.mode === "add-items" ? routeState.order : null;
  const isAddItemsMode = Boolean(isCashier && addModeOrder);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [type, setType] = useState<"dine-in" | "takeout">(addModeOrder?.type || "dine-in");
  const [tableNumber, setTableNumber] = useState(addModeOrder?.tableNumber || "");
  const [qty, setQty] = useState<QtyMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [crewIdInput, setCrewIdInput] = useState("");
  const [validatedCrew, setValidatedCrew] = useState<AppUser | null>(null);
  const [validatingCrew, setValidatingCrew] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [vatEnabled, setVatEnabled] = useState(false);

  useEffect(() => {
    getMenuItems()
      .then((data) => setMenu(data.filter((m) => m.isAvailable)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isCashier || routeState?.mode !== "add-items") return;
    if (!addModeOrder) {
      showToast("Add items", "Open add-item flow from the cashier orders page.", "warning");
      navigate("/cashier/orders", { replace: true });
    }
  }, [addModeOrder, isCashier, navigate, routeState?.mode, showToast]);

  useEffect(() => {
    if (!addModeOrder) return;
    setType(addModeOrder.type);
    setTableNumber(addModeOrder.tableNumber || "");
  }, [addModeOrder]);

  useEffect(() => {
    if (isCashier && user) {
      setValidatedCrew(user);
      return;
    }
    setValidatedCrew(null);
  }, [isCashier, user]);

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
  }, [category, menu, menuSearch]);

  const selectedLines = useMemo(
    () =>
      menu
        .map((m) => ({ item: m, qty: qty[m.id] || 0 }))
        .filter((x) => qty[x.item.id] !== undefined),
    [menu, qty],
  );

  const getItemStep = (itemId: string) => {
    const item = menu.find((menuItem) => menuItem.id === itemId);
    return item?.category?.trim().toLowerCase() === "hito" ? 0.25 : 1;
  };

  const subtotal = useMemo(
    () =>
      selectedLines.reduce(
        (sum, line) => sum + line.item.price * Math.max(0, line.qty),
        0,
      ),
    [selectedLines],
  );

  const { tax, total } = computeOrderTotals(subtotal, vatEnabled);

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

  const handleMenuItemClick = (item: MenuItem) => {
    addMenuItem(item);
  };

  const setItemQty = (itemId: string, next: number) => {
    const value = Math.max(0, Number(next.toFixed(2)));
    setQty((prev) => ({ ...prev, [itemId]: value }));
  };

  const increaseItemQty = (itemId: string) => {
    setItemQty(itemId, (qty[itemId] || 0) + getItemStep(itemId));
  };

  const decreaseItemQty = (itemId: string) => {
    const current = qty[itemId] || 0;
    const step = getItemStep(itemId);
    if (current <= step) {
      removeMenuItem(itemId);
      return;
    }
    setItemQty(itemId, current - step);
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
    if (type === "dine-in" && !tableNumber.trim()) {
      showToast(
        "Validation",
        "Enter table number before creating order",
        "warning",
      );
      return;
    }

    const tableForOrder = type === "takeout" ? "Takeout" : tableNumber.trim();

    setSubmitting(true);
    try {
      if (isAddItemsMode && addModeOrder) {
        await addNewItemsToOrderByCashier(user, addModeOrder, selectedLines, {
          vatEnabled,
        });
        showToast("Success", `Items added to ${addModeOrder.orderNumber}`);
        setQty({});
        navigate("/cashier/orders");
        return;
      }

      await createOrder(
        user,
        type,
        selectedLines,
        {
          uid: validatedCrew.id,
          employeeId: validatedCrew.employeeId || crewIdInput.trim() || validatedCrew.id,
          displayName: validatedCrew.displayName,
        },
        tableForOrder,
        {
          vatEnabled,
          ...(isCashier
            ? {
                initialStatus: "ready" as const,
                actorUid: user.id,
                actorRole: "cashier" as const,
                actorName: `${user.displayName}${user.employeeId ? ` [${user.employeeId}]` : ""}`,
                message: `Cashier created ready order (${user.employeeId || user.id})`,
                metadata: { createdByRole: "cashier" },
              }
            : {}),
        },
      );
      showToast("Success", "Order created");
      setQty({});
      setType("dine-in");
      setTableNumber("");
      setVatEnabled(false);
      setCrewIdInput("");
      if (!isCashier)       setValidatedCrew(null);
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="pos-loading"><div className="spinner-border text-danger" /></div>;

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

      <div className="pos-layout">
        <MenuSelectionView
          categories={categories}
          category={category}
          displayedMenu={displayedMenu}
          menu={menu}
          qty={qty}
          onCategoryChange={setCategory}
          onItemClick={handleMenuItemClick}
          addMenuItem={addMenuItem}
          onQtyChange={setItemQty}
          onIncrease={increaseItemQty}
          onDecrease={decreaseItemQty}
          validatedCrew={validatedCrew}
        />

        <OrderSidePanel
          selectedLines={selectedLines}
          type={type}
          tableNumber={tableNumber}
          subtotal={subtotal}
          tax={tax}
          total={total}
          vatEnabled={vatEnabled}
          submitting={submitting}
          validatedCrew={validatedCrew}
          submitLabel={isAddItemsMode ? "Add Items to Order" : "Checkout Order"}
          lockOrderMeta={isAddItemsMode}
          orderModeLabel={isAddItemsMode ? `Add Items to ${addModeOrder?.orderNumber}` : undefined}
          onTypeChange={setType}
          onTableNumberChange={setTableNumber}
          onVatEnabledChange={setVatEnabled}
          onQtyChange={setItemQty}
          onIncrease={increaseItemQty}
          onDecrease={decreaseItemQty}
          onRemove={removeMenuItem}
          onClearOrder={() => setQty({})}
          onSubmit={submit}
        />
      </div>
    </>
  );
}
