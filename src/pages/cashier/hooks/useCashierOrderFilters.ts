import { useMemo, useState } from "react";
import { Order } from "../../../types";

type QuickFilter = "all" | "unpaid" | "paid" | "ready";

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useCashierOrderFilters(orders: Order[]) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const selectedDateLabel = useMemo(
    () =>
      new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [selectedDate],
  );

  const visible = useMemo(
    () => orders.filter((o) => o.status !== "cancelled"),
    [orders],
  );

  const dateVisible = useMemo(
    () =>
      visible.filter((o) => {
        const created = o.createdAt?.toDate();
        if (!created) return false;
        return toDateKey(created) === selectedDate;
      }),
    [visible, selectedDate],
  );

  const unpaidCount = useMemo(
    () => dateVisible.filter((o) => o.paymentStatus === "unpaid").length,
    [dateVisible],
  );
  const paidCount = useMemo(
    () => dateVisible.filter((o) => o.paymentStatus === "paid").length,
    [dateVisible],
  );
  const readyCount = useMemo(
    () => dateVisible.filter((o) => o.status === "ready").length,
    [dateVisible],
  );

  const filteredOrders = useMemo(() => {
    if (quickFilter === "unpaid") {
      return dateVisible.filter((o) => o.paymentStatus === "unpaid");
    }
    if (quickFilter === "paid") {
      return dateVisible.filter((o) => o.paymentStatus === "paid");
    }
    if (quickFilter === "ready") {
      return dateVisible.filter((o) => o.status === "ready");
    }
    return dateVisible;
  }, [dateVisible, quickFilter]);

  return {
    quickFilter,
    setQuickFilter,
    selectedDate,
    setSelectedDate,
    todayKey,
    selectedDateLabel,
    unpaidCount,
    paidCount,
    readyCount,
    filteredOrders,
  };
}
