import { z } from "zod";
import { sqlServerGuidSchema } from "@/lib/validators/uuid";

export const pantryItemSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  userId: z.string().min(1, "userId is required").optional(),
  ingredientId: sqlServerGuidSchema,
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/, "quantity must be a decimal value"),
  unit: z.string().min(1, "unit is required").max(30),
  expiryDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
});
