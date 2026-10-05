import { z } from "zod";
import { sqlServerGuidSchema } from "@/lib/validators/uuid";

export const ingredientSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  userId: z.string().min(1, "userId is required").optional(),
  name: z.string().min(1, "name is required").max(120),
  unit: z.string().min(1, "unit is required").max(30),
  category: z.string().min(1, "category is required").max(60),
});
