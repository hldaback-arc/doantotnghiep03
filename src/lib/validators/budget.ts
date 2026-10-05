import { z } from "zod";
import { sqlServerGuidSchema } from "./uuid.ts";

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format");

const optionalCategory = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(50).optional(),
);
const optionalCategoryLimit = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().regex(/^\d{1,17}(\.\d{1,2})?$/, "categoryLimit must fit a decimal(19,2) amount")
    .refine((value) => /[1-9]/.test(value), "categoryLimit must be greater than zero")
    .optional(),
);

export const budgetSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  month: monthSchema,
  category: optionalCategory,
  categoryLimit: optionalCategoryLimit,
  total: z
    .string()
    .regex(/^\d{1,17}(\.\d{1,2})?$/, "total must fit a decimal(19,2) amount")
    .refine((value) => /[1-9]/.test(value), "total must be greater than zero"),
}).refine((payload) => !payload.category || Boolean(payload.categoryLimit), {
  message: "categoryLimit is required when category is set",
  path: ["categoryLimit"],
});
