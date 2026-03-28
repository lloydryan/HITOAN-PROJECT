import { z } from "zod";

export const menuSchema = z
  .object({
    name: z.string().min(2),
    price: z.coerce.number().positive(),
    category: z.string(),
    newCategory: z.string().optional(),
    isAvailable: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.category === "__new__") {
        return (data.newCategory?.trim().length ?? 0) >= 2;
      }
      return data.category.length >= 2;
    },
    {
      message: "Select a category or type a new one (min 2 characters)",
      path: ["category"],
    },
  );

export type MenuSchema = z.infer<typeof menuSchema>;
