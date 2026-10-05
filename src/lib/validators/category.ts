import { z } from "zod";

export const categoryTypeSchema = z.enum(["income", "expense"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: categoryTypeSchema,
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});