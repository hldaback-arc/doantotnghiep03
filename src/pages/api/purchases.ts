import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { purchaseSchema } from "@/lib/validators/shopping";
import { getSessionUserId } from "@/server/auth/session";
import { createPurchaseFromCart } from "@/server/services/shopping.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "POST") {
    try {
      const payload = purchaseSchema.parse(req.body);
      const purchase = await createPurchaseFromCart({
        userId,
        cartId: payload.cartId,
        idempotencyKey: payload.idempotencyKey,
        lines: payload.lines.map((line) => ({
          productId: line.productId,
          storeId: line.storeId,
          quantity: line.quantity,
          unit: line.unit,
          unitPriceSnapshot: line.unitPriceSnapshot,
        })),
      });
      return sendSuccess(res, purchase, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
          const field = issue.path.join(".") || "body";
          acc[field] = [issue.message];
          return acc;
        }, {});
        return sendError(res, "VALIDATION_ERROR", "Invalid purchase payload.", fields);
      }
      return sendError(res, "INTERNAL_ERROR", "Failed to create purchase.");
    }
  }

  return sendError(res, "METHOD_NOT_ALLOWED", "Only POST is allowed.");
}
