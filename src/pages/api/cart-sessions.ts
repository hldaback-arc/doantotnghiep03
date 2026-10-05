import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { cartSessionSchema } from "@/lib/validators/meal-plan";
import { getSessionUserId } from "@/server/auth/session";
import { createCartSession, listCartSessions } from "@/server/services/meal-plans.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "GET") {
    return sendSuccess(res, await listCartSessions(userId));
  }

  if (req.method === "POST") {
    try {
      const payload = cartSessionSchema.parse(req.body);
      const session = await createCartSession({
        id: payload.id ?? crypto.randomUUID(),
        userId,
        mealPlanId: payload.mealPlanId ?? null,
        budgetSnapshot: payload.budgetSnapshot,
        strategy: payload.strategy,
        status: payload.status,
      });
      return sendSuccess(res, session, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
          const field = issue.path.join(".") || "body";
          acc[field] = [issue.message];
          return acc;
        }, {});
        return sendError(res, "VALIDATION_ERROR", "Invalid cart session payload.", fields);
      }
      return sendError(res, "INTERNAL_ERROR", "Failed to create cart session.");
    }
  }

  return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
}
