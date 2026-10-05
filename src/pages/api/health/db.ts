import type { NextApiRequest, NextApiResponse } from "next";

import { sendError, sendSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET is allowed.");
  }

  try {
    await prisma.$queryRaw`SELECT 1 AS connected`;
    return sendSuccess(res, {
      status: "ok",
      database: "connected",
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return sendError(res, "DATABASE_UNAVAILABLE", "Could not connect to SQL Server.", undefined, 503);
  }
}