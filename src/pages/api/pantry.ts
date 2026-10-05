import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { pantryItemSchema } from "@/lib/validators/pantry";
import { getSessionUserId } from "@/server/auth/session";
import { addPantryItem, listPantry } from "@/server/services/meal.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "GET") {
    return sendSuccess(res, await listPantry(userId));
  }

  if (req.method === "POST") {
    try {
      const payload = pantryItemSchema.parse(req.body);
      const pantryItem = await addPantryItem({
        id: payload.id ?? crypto.randomUUID(),
        userId,
        ingredientId: payload.ingredientId,
        quantity: payload.quantity,
        unit: payload.unit,
        expiryDate: payload.expiryDate || undefined,
      });

      return sendSuccess(res, pantryItem, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
          const field = issue.path.join(".") || "body";
          acc[field] = [issue.message];
          return acc;
        }, {});

        return sendError(res, "VALIDATION_ERROR", "Invalid pantry payload.", fields);
      }

      return sendError(res, "INTERNAL_ERROR", "Failed to add pantry item.");
    }
  }

  return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
}
