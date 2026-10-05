import { z } from "zod";

export const budgetAlertSettingsSchema = z.object({
  thresholds: z
    .array(
      z.number().finite().min(0.01).max(100).refine(
        (value) => Number.isInteger(value * 100),
        "thresholds support at most two decimal places",
      ),
    )
    .min(1)
    .max(10)
    .refine((thresholds) => new Set(thresholds).size === thresholds.length, {
      message: "thresholds must be unique",
    }),
});