import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { monthSchema } from "@/lib/validators/budget";
import { transactionSchema } from "@/lib/validators/transaction";
import { getSessionUserId } from "@/server/auth/session";
import { createTransaction, listTransactions } from "@/server/services/budget.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) {
    return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);
  }

  if (req.method === "GET") {
    const monthValue = req.query.month;
    if (monthValue !== undefined && typeof monthValue !== "string") {
      return sendError(res, "VALIDATION_ERROR", "Invalid month query parameter.", {
        month: ["month must be a single YYYY-MM value"],
      });
    }
    const month = monthValue === undefined ? undefined : monthSchema.safeParse(monthValue);
    if (month && !month.success) {
      return sendError(res, "VALIDATION_ERROR", "Invalid month query parameter.", {
        month: month.error.issues.map((issue) => issue.message),
      });
    }

    try {
      return sendSuccess(res, await listTransactions(userId, month?.data));
    } catch {
      return sendError(res, "INTERNAL_ERROR", "Failed to list transactions.");
    }
  }

  try {
    const payload = transactionSchema.parse(req.body);
    const idempotencyHeader = req.headers["idempotency-key"];
    if (Array.isArray(idempotencyHeader)) {
      return sendError(res, "VALIDATION_ERROR", "Idempotency-Key must be a single value.", {
        "Idempotency-Key": ["Idempotency-Key must be a single value"],
      });
    }
    if (idempotencyHeader && (idempotencyHeader.length > 100 || !idempotencyHeader.trim())) {
      return sendError(res, "VALIDATION_ERROR", "Invalid Idempotency-Key header.", {
        "Idempotency-Key": ["Idempotency-Key must contain 1 to 100 characters"],
      });
    }
    const transaction = await createTransaction({
      id: payload.id ?? crypto.randomUUID(),
      idempotencyKey: idempotencyHeader,
      userId,
      type: payload.type,
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
    });

    return sendSuccess(res, transaction, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});

      return sendError(res, "VALIDATION_ERROR", "Invalid transaction payload.", fields);
    }

    return sendError(res, "INTERNAL_ERROR", "Failed to create transaction.");
  }
}
