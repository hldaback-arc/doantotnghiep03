import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { transactionSchema } from "@/lib/validators/transaction";
import { sqlServerGuidSchema } from "@/lib/validators/uuid";
import { getSessionUserId } from "@/server/auth/session";
import { deleteTransaction, updateTransaction } from "@/server/services/budget.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only PATCH or DELETE is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  const id = sqlServerGuidSchema.safeParse(req.query.id);
  if (!id.success) {
    return sendError(res, "VALIDATION_ERROR", "A valid transaction id is required.", {
      id: ["id must be a UUID"],
    });
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await deleteTransaction(userId, id.data);
      if (!deleted) return sendError(res, "NOT_FOUND", "Transaction not found.", undefined, 404);
      return sendSuccess(res, { deleted: true });
    } catch {
      return sendError(res, "INTERNAL_ERROR", "Failed to delete transaction.");
    }
  }

  try {
    const payload = transactionSchema.parse(req.body);
    const updated = await updateTransaction(userId, id.data, {
      type: payload.type,
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
    });
    if (!updated) return sendError(res, "NOT_FOUND", "Transaction not found.", undefined, 404);
    return sendSuccess(res, updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid transaction payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to update transaction.");
  }
}