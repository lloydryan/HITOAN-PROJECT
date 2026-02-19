import { z } from "zod";

export const menuSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().positive(),
  category: z.string().min(2),
  isAvailable: z.boolean()
});

export type MenuSchema = z.infer<typeof menuSchema>;
