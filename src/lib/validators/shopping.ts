import { z } from "zod";
import { sqlServerGuidSchema } from "./uuid.ts";

export const cartLineSchema = z.object({
  productId: sqlServerGuidSchema,
  storeId: sqlServerGuidSchema,
  quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, "quantity must be a decimal value"),
  unit: z.string().min(1).max(30),
  unitPriceSnapshot: z.string().regex(/^\d+(\.\d{1,2})?$/, "unitPriceSnapshot must be a decimal value"),
});

export const purchaseSchema = z.object({
  id: sqlServerGuidSchema.optional(),
  cartId: sqlServerGuidSchema,
  idempotencyKey: z.string().min(1).max(100),
  lines: z.array(cartLineSchema).min(1, "At least one cart line is required"),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});
