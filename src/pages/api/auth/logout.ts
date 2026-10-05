import type { NextApiRequest, NextApiResponse } from "next";

import { sendError, sendSuccess } from "@/lib/api";
import { clearSessionCookie } from "@/server/auth/session";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only POST is allowed.");
  }

  clearSessionCookie(res);
  return sendSuccess(res, { signedOut: true });
}