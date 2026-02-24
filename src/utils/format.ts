export const currency = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

export const dt = (date?: Date) =>
  date ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date) : "-";
