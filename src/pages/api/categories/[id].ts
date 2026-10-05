import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { updateCategorySchema } from "@/lib/validators/category";
import { sqlServerGuidSchema } from "@/lib/validators/uuid";
import { getSessionUserId } from "@/server/auth/session";
import {
  deleteCategoryForUser,
  updateCategoryForUser,
} from "@/server/repositories/finance-settings.repository";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only PATCH or DELETE is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  const id = sqlServerGuidSchema.safeParse(req.query.id);
  if (!id.success) {
    return sendError(res, "VALIDATION_ERROR", "A valid category id is required.", {
      id: ["id must be a UUID"],
    });
  }

  try {
    if (req.method === "DELETE") {
      const result = await deleteCategoryForUser(userId, id.data);
      if (!result.count) return sendError(res, "NOT_FOUND", "Category not found.", undefined, 404);
      return sendSuccess(res, { deleted: true });
    }

    const payload = updateCategorySchema.parse(req.body);
    const category = await updateCategoryForUser(userId, id.data, payload.name);
    if (!category) return sendError(res, "NOT_FOUND", "Category not found.", undefined, 404);
    return sendSuccess(res, {
      id: category.id,
      name: category.name,
      type: category.type.toLowerCase(),
      isDefault: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid category payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to update or delete category.");
  }
}