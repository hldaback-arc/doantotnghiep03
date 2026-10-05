import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { profileSchema } from "@/lib/validators/profile";
import { getSessionUserId } from "@/server/auth/session";
import { getProfileByUser, saveProfileForUser } from "@/server/repositories/finance-settings.repository";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET or PATCH is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  try {
    if (req.method === "GET") {
      const profile = await getProfileByUser(userId);
      return sendSuccess(res, profile ? {
        fullName: profile.full_name,
        phone: profile.phone,
        defaultLat: profile.default_lat?.toString() ?? null,
        defaultLng: profile.default_lng?.toString() ?? null,
        defaultAddress: profile.default_address,
      } : null);
    }

    const payload = profileSchema.parse(req.body);
    const profile = await saveProfileForUser(userId, payload);
    return sendSuccess(res, {
      fullName: profile.full_name,
      phone: profile.phone,
      defaultLat: profile.default_lat?.toString() ?? null,
      defaultLng: profile.default_lng?.toString() ?? null,
      defaultAddress: profile.default_address,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid profile payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to load or update profile.");
  }
}