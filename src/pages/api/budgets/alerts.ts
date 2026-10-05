import type { NextApiRequest, NextApiResponse } from "next";

import { sendError, sendSuccess } from "@/lib/api";
import { monthSchema } from "@/lib/validators/budget";
import { getSessionUserId } from "@/server/auth/session";
import { getBudgetAlerts } from "@/server/services/budget.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  const parsedMonth = monthSchema.safeParse(req.query.month ?? new Date().toISOString().slice(0, 7));
  if (!parsedMonth.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid month query parameter.", {
      month: parsedMonth.error.issues.map((issue) => issue.message),
    });
  }

  try {
    return sendSuccess(res, await getBudgetAlerts(userId, parsedMonth.data));
  } catch {
    return sendError(res, "INTERNAL_ERROR", "Failed to load budget alerts.");
  }
}