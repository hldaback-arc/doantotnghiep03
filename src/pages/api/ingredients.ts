import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { ingredientSchema } from "@/lib/validators/ingredient";
import { getSessionUserId } from "@/server/auth/session";
import { createIngredient, listIngredients } from "@/server/services/meal.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "GET") {
    return sendSuccess(res, await listIngredients(userId));
  }

  if (req.method === "POST") {
    try {
      const payload = ingredientSchema.parse(req.body);
      const ingredient = await createIngredient({
        id: payload.id ?? crypto.randomUUID(),
        userId,
        name: payload.name,
        unit: payload.unit,
        category: payload.category,
      });

      return sendSuccess(res, ingredient, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
          const field = issue.path.join(".") || "body";
          acc[field] = [issue.message];
          return acc;
        }, {});

        return sendError(res, "VALIDATION_ERROR", "Invalid ingredient payload.", fields);
      }

      return sendError(res, "INTERNAL_ERROR", "Failed to create ingredient.");
    }
  }

  return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
}
