import { z } from "zod";

export const paymentSchema = z
  .object({
    amountPaid: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional()),
    method: z.enum(["cash", "gcash", "qr"]),
    transferLast4: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.string().regex(/^\d{4}$/, "Must be exactly 4 digits").optional()
    )
  })
  .superRefine((data, ctx) => {
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
