export const VAT_RATE = 0.12;

export function computeOrderTotals(subtotal: number, vatEnabled = true) {
  const normalizedSubtotal = Number(subtotal.toFixed(2));
  const tax = vatEnabled ? Number((normalizedSubtotal * VAT_RATE).toFixed(2)) : 0;
  const total = Number((normalizedSubtotal + tax).toFixed(2));

  return {
    subtotal: normalizedSubtotal,
    tax,
    total,
  };
}

export function getVatLabel(vatEnabled = true) {
  return vatEnabled ? "VAT (12%)" : "VAT";
}
