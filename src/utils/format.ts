export const currency = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

/** Receipt-only: adds space after ₱ for readability (e.g. ₱ 425.60) */
export const currencyReceipt = (value: number) => {
  const formatted = currency(value);
  return formatted.replace("₱", "₱ ");
};

export const dt = (date?: Date) =>
  date ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date) : "-";

/** Compact format for tables: "Mar 13 • 12:03 AM" */
export const dtShort = (date?: Date) =>
  date
    ? [
        new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date),
        new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(date),
      ].join(" • ")
    : "-";
