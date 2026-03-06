import { z } from "zod";

export const paymentSchema = z
  .object({
    amountPaid: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional()),
    method: z.enum(["cash", "gcash", "qr"]),
    discountType: z.enum(["none", "pwd", "senior"]),
    totalPersons: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional()),
    discountedPersons: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional()),
    transferLast4: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.string().regex(/^\d{4}$/, "Must be exactly 4 digits").optional()
    )
  })
  .superRefine((data, ctx) => {
    if (data.discountType !== "none") {
      const totalPersons = Number(data.totalPersons);
      const discountedPersons = Number(data.discountedPersons);
      if (!Number.isFinite(totalPersons) || totalPersons < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalPersons"],
          message: "Total persons must be at least 1"
        });
      } else if (!Number.isInteger(totalPersons)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalPersons"],
          message: "Total persons must be a whole number"
        });
      }
      if (!Number.isFinite(discountedPersons) || discountedPersons < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountedPersons"],
          message: "Discounted persons must be at least 1"
        });
      } else if (!Number.isInteger(discountedPersons)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountedPersons"],
          message: "Discounted persons must be a whole number"
        });
      }
      if (
        Number.isFinite(totalPersons) &&
        Number.isFinite(discountedPersons) &&
        discountedPersons > totalPersons
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountedPersons"],
          message: "Discounted persons cannot exceed total persons"
        });
      }
    }

    if (data.method === "cash") {
      if (data.amountPaid === undefined || Number.isNaN(data.amountPaid) || data.amountPaid <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amountPaid"],
          message: "Amount paid is required for cash"
        });
      }
    } else if (!data.transferLast4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferLast4"],
        message: "Last 4 digits are required"
      });
    }
  });

export type PaymentSchema = z.infer<typeof paymentSchema>;
