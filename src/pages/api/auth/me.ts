import type { NextApiRequest, NextApiResponse } from "next";

import { sendError, sendSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/server/auth/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET is allowed.");
  }

  const userId = getSessionUserId(req);
  if (!userId) return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, deleted_at: true, profiles: { select: { full_name: true } } },
    });
    if (!user || user.deleted_at) {
      return sendError(res, "UNAUTHORIZED", "Sign in is required.", undefined, 401);
    }
    return sendSuccess(res, { id: user.id, email: user.email, name: user.profiles?.full_name ?? null });
  } catch {
    return sendError(res, "INTERNAL_ERROR", "Failed to load account.");
  }
}