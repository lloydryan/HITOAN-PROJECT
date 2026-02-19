import { z } from "zod";

export const createUserSchema = z.object({
  displayName: z.string().min(2),
  employeeId: z.string().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "cashier", "crew", "kitchen"])
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
