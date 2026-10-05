import { z } from "zod";
import { sqlServerGuidSchema } from "./uuid.ts";

export const transactionSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(50),
  amount: z
    .string()
    .regex(/^\d{1,17}(\.\d{1,2})?$/, "amount must fit a decimal(19,2) amount")
    .refine((value) => /[1-9]/.test(value), "amount must be greater than zero"),
  description: z.string().min(1).max(200),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "date must be a valid ISO string",
  }),
});
