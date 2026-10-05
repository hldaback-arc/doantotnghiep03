import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { categoryTypeSchema, createCategorySchema } from "@/lib/validators/category";
import { getSessionUserId } from "@/server/auth/session";
import {
  createCategoryForUser,
  listCategoriesForUser,
} from "@/server/repositories/finance-settings.repository";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or POST is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  try {
    if (req.method === "GET") {
      let type: "INCOME" | "EXPENSE" | undefined;
      if (req.query.type !== undefined) {
        const parsedType = categoryTypeSchema.safeParse(req.query.type);
        if (!parsedType.success) {
          return sendError(res, "VALIDATION_ERROR", "type must be income or expense.", {
            type: ["type must be income or expense"],
          });
        }
        type = parsedType.data.toUpperCase() as "INCOME" | "EXPENSE";
      }

      const categories = await listCategoriesForUser(userId, type);
      return sendSuccess(res, categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type.toLowerCase(),
        isDefault: category.user_id === null,
      })));
    }

    const payload = createCategorySchema.parse(req.body);
    const category = await createCategoryForUser(userId, {
      name: payload.name,
      type: payload.type.toUpperCase() as "INCOME" | "EXPENSE",
    });
    return sendSuccess(res, {
      id: category.id,
      name: category.name,
      type: category.type.toLowerCase(),
      isDefault: false,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid category payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to load or create category.");
  }
}