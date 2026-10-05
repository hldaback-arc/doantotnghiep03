import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { sendError, sendSuccess } from "@/lib/api";
import { registerSchema } from "@/lib/validators/auth";
import { hashPassword } from "@/server/auth/password";
import { assertSessionConfig, setSessionCookie } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only POST is allowed.");
  }

  try {
    assertSessionConfig();
    const payload = registerSchema.parse(req.body);
    const email = payload.email.toLowerCase();
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(res, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.", undefined, 409);
    }

    const user = await prisma.users.create({
      data: {
        email,
        password_hash: await hashPassword(payload.password),
        role: "USER",
        status: "ACTIVE",
        ...(payload.name ? { profiles: { create: { full_name: payload.name } } } : {}),
      },
      select: { id: true, email: true, profiles: { select: { full_name: true } } },
    });

    setSessionCookie(res, user.id);
    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.profiles?.full_name ?? null,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const field = issue.path.join(".") || "body";
        acc[field] = [issue.message];
        return acc;
      }, {});
      return sendError(res, "VALIDATION_ERROR", "Invalid registration payload.", fields);
    }
    return sendError(res, "INTERNAL_ERROR", "Failed to create account.");
  }
}