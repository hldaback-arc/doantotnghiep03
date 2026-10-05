import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { budgetSchema } from "@/lib/validators/budget";
import { sqlServerGuidSchema } from "@/lib/validators/uuid";
import { getSessionUserId } from "@/server/auth/session";
import { deleteBudget, updateBudget } from "@/server/services/budget.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only PATCH or DELETE is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  const id = sqlServerGuidSchema.safeParse(req.query.id);
  if (!id.success) {
    return sendError(res, "VALIDATION_ERROR", "A valid budget id is required.", {
      id: ["id must be a UUID"],
    });
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await deleteBudget(userId, id.data);
      if (!deleted) return sendError(res, "NOT_FOUND", "Budget not found.", undefined, 404);
      return sendSuccess(res, { deleted: true });
    } catch {
      return sendError(res, "INTERNAL_ERROR", "Failed to delete budget.");
    }
  }

  try {
    const payload = budgetSchema.parse(req.body);
    const updated = await updateBudget(userId, id.data, {
      month: payload.month,
      total: payload.total,
      category: payload.category,
      categoryLimit: payload.categoryLimit,
    });
    if (!updated) return sendError(res, "NOT_FOUND", "Budget not found.", undefined, 404);
    return sendSuccess(res, updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid budget payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to update budget.");
  }
}