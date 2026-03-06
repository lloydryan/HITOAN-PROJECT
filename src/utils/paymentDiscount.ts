import { DiscountType } from "../types";

const DISCOUNT_RATES: Record<DiscountType, number> = {
  none: 0,
  pwd: 0.2,
  senior: 0.2,
};

interface DiscountInput {
  orderTotal: number;
  discountType: DiscountType;
  totalPersons?: number;
  discountedPersons?: number;
}

export function computeDiscountBreakdown(input: DiscountInput) {
  const orderTotal = Number(input.orderTotal) || 0;
  const discountType = input.discountType;
  const discountRate = DISCOUNT_RATES[discountType] ?? 0;
  const normalizedTotalPersons = Math.max(
    1,
    Math.floor(Number(input.totalPersons) || 1),
  );
  const normalizedDiscountedPersons = Math.max(
    0,
    Math.floor(Number(input.discountedPersons) || 0),
  );
  const cappedDiscountedPersons = Math.min(
    normalizedDiscountedPersons,
    normalizedTotalPersons,
  );
  const sharePerPerson = Number((orderTotal / normalizedTotalPersons).toFixed(2));
  const discountableBase = Number(
    (sharePerPerson * cappedDiscountedPersons).toFixed(2),
  );
  const discountAmount =
    discountType === "none"
      ? 0
      : Number((discountableBase * discountRate).toFixed(2));
  const amountDue = Number((orderTotal - discountAmount).toFixed(2));

  return {
    discountType,
    discountRate,
    totalPersons: normalizedTotalPersons,
    discountedPersons: cappedDiscountedPersons,
    sharePerPerson,
    discountAmount,
    amountDue,
  };
}
