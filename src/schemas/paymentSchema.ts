import { z } from "zod";

export const paymentSchema = z.object({
  amountPaid: z.coerce.number().positive(),
  method: z.enum(["cash", "gcash", "card"])
});

export type PaymentSchema = z.infer<typeof paymentSchema>;
