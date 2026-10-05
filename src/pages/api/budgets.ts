import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { budgetSchema, monthSchema } from "@/lib/validators/budget";
import { getSessionUserId } from "@/server/auth/session";
import { createBudget, getBudgetSummary, listBudgets } from "@/server/services/budget.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) {
    return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);
  }

  if (req.method === "GET") {
    if (req.query.summary === "true") {
      const month = monthSchema.safeParse(req.query.month ?? new Date().toISOString().slice(0, 7));
      if (!month.success) {
        return sendError(res, "VALIDATION_ERROR", "Invalid month query parameter.", {
          month: month.error.issues.map((issue) => issue.message),
        });
      }

      try {
        return sendSuccess(res, await getBudgetSummary(userId, month.data));
      } catch {
        return sendError(res, "INTERNAL_ERROR", "Failed to load budget summary.");
      }
    }

    try {
      return sendSuccess(res, await listBudgets(userId));
    } catch {
      return sendError(res, "INTERNAL_ERROR", "Failed to list budgets.");
    }
  }

  try {
    const payload = budgetSchema.parse(req.body);
    const budget = await createBudget({
      id: payload.id ?? crypto.randomUUID(),
      userId,
      month: payload.month,
      category: payload.category,
      categoryLimit: payload.categoryLimit,
      total: payload.total,
    });

    return sendSuccess(res, budget, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});

      return sendError(res, "VALIDATION_ERROR", "Invalid budget payload.", fields);
    }

    return sendError(res, "INTERNAL_ERROR", "Failed to create budget.");
  }
}
