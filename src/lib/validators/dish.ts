import { z } from "zod";
import { sqlServerGuidSchema } from "@/lib/validators/uuid";

export const dishIngredientSchema = z.object({
  ingredientId: sqlServerGuidSchema,
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/, "quantity must be a decimal value"),
  unit: z.string().min(1, "unit is required").max(30),
});

export const dishSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  userId: z.string().min(1, "userId is required").optional(),
  name: z.string().min(1, "name is required").max(120),
  description: z.string().max(400).optional(),
  ingredients: z.array(dishIngredientSchema).min(1, "At least one ingredient is required"),
});
