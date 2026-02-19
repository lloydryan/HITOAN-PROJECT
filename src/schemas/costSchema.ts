import { z } from "zod";

export const costSchema = z.object({
  type: z.string().min(2),
  value: z.coerce.number().positive(),
  note: z.string().optional()
});

export type CostSchema = z.infer<typeof costSchema>;
