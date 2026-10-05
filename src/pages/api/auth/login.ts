import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { loginSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/server/auth/password";
import { assertSessionConfig, setSessionCookie } from "@/server/auth/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only POST is allowed.");
  }

  try {
    assertSessionConfig();
    const payload = loginSchema.parse(req.body);
    const user = await prisma.users.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        deleted_at: true,
        profiles: { select: { full_name: true } },
      },
    });
    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.deleted_at ||
      !(await verifyPassword(payload.password, user.password_hash))
    ) {
      return sendError(res, "INVALID_CREDENTIALS", "Email or password is incorrect.", undefined, 401);
    }

    setSessionCookie(res, user.id);
    return sendSuccess(res, { id: user.id, email: user.email, name: user.profiles?.full_name ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid login payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to sign in.");
  }
}