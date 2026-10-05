import { z } from "zod";
import { sqlServerGuidSchema } from "./uuid.ts";

export const mealPlanItemSchema = z.object({
  dishId: sqlServerGuidSchema.optional(),
  dayNumber: z.number().int().min(1).max(30),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servings: z.string().regex(/^\d+(\.\d{1,3})?$/, "servings must be a decimal value"),
  dishNameSnapshot: z.string().min(1).max(160),
});

export const mealPlanSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  planDate: z.string().min(1),
  peopleCount: z.number().int().min(1).max(20),
  dayCount: z.number().int().min(1).max(30),
  goal: z.string().max(30).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  items: z.array(mealPlanItemSchema).default([]),
});

export const cartSessionSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  mealPlanId: sqlServerGuidSchema.optional().nullable(),
  budgetSnapshot: z.string().regex(/^\d+(\.\d{1,2})?$/, "budgetSnapshot must be a decimal value"),
  strategy: z.string().min(1).max(30),
  status: z.string().max(20).optional(),
});
