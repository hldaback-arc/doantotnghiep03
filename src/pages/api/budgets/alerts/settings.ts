import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { budgetAlertSettingsSchema } from "@/lib/validators/budget-alert";
import { getSessionUserId } from "@/server/auth/session";
import {
  getBudgetAlertSettings,
  saveBudgetAlertSettings,
} from "@/server/services/budget.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PUT") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or PUT is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  if (req.method === "GET") {
    try {
      return sendSuccess(res, await getBudgetAlertSettings(userId));
    } catch {
      return sendError(res, "INTERNAL_ERROR", "Failed to load budget alert settings.");
    }
  }

  try {
    const payload = budgetAlertSettingsSchema.parse(req.body);
    return sendSuccess(res, await saveBudgetAlertSettings(userId, payload.thresholds));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid budget alert settings.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to save budget alert settings.");
  }
}