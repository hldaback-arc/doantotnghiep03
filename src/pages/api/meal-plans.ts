import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { mealPlanSchema } from "@/lib/validators/meal-plan";
import { getSessionUserId } from "@/server/auth/session";
import { createMealPlan, listMealPlans } from "@/server/services/meal-plans.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "GET") {
    return sendSuccess(res, await listMealPlans(userId));
  }

  if (req.method === "POST") {
    try {
      const payload = mealPlanSchema.parse(req.body);
      const plan = await createMealPlan({
        id: payload.id ?? crypto.randomUUID(),
        userId,
        planDate: payload.planDate,
        peopleCount: payload.peopleCount,
        dayCount: payload.dayCount,
        goal: payload.goal ?? null,
        status: payload.status,
      });
      return sendSuccess(res, plan, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
          const field = issue.path.join(".") || "body";
          acc[field] = [issue.message];
          return acc;
        }, {});
        return sendError(res, "VALIDATION_ERROR", "Invalid meal plan payload.", fields);
      }
      return sendError(res, "INTERNAL_ERROR", "Failed to create meal plan.");
    }
  }

  return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
}
