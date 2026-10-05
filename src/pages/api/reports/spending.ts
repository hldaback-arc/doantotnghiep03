import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { getSessionUserId } from "@/server/auth/session";
import { getSpendingReport } from "@/server/services/budget.service";

const reportQuerySchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).default("month"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(new Date().toISOString().slice(0, 10)),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  const query = reportQuerySchema.safeParse({
    period: req.query.period,
    date: req.query.date,
  });
  if (!query.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid spending report query.", {
      query: query.error.issues.map((issue) => issue.message),
    });
  }

  const date = new Date(`${query.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== query.data.date) {
    return sendError(res, "VALIDATION_ERROR", "date must be a valid calendar date.");
  }

  try {
    return sendSuccess(res, await getSpendingReport(userId, query.data.period, query.data.date));
  } catch {
    return sendError(res, "INTERNAL_ERROR", "Failed to build spending report.");
  }
}