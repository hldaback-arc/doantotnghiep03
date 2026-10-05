import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { dishSchema } from "@/lib/validators/dish";
import { getSessionUserId } from "@/server/auth/session";
import { createDish, getDishIngredientsStatus, listDishes } from "@/server/services/meal.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "GET") {
    const dishId = typeof req.query.dishId === "string" ? req.query.dishId : undefined;
    if (dishId) {
      return sendSuccess(res, await getDishIngredientsStatus(userId, dishId));
    }

    return sendSuccess(res, await listDishes(userId));
  }

  if (req.method === "POST") {
    try {
      const payload = dishSchema.parse(req.body);
      const dish = await createDish({
        id: payload.id ?? crypto.randomUUID(),
        userId,
        name: payload.name,
        description: payload.description,
        ingredients: payload.ingredients,
      });

      return sendSuccess(res, dish, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
          const field = issue.path.join(".") || "body";
          acc[field] = [issue.message];
          return acc;
        }, {});

        return sendError(res, "VALIDATION_ERROR", "Invalid dish payload.", fields);
      }

      return sendError(res, "INTERNAL_ERROR", "Failed to create dish.");
    }
  }

  return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
}
