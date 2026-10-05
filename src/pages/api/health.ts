import type { NextApiRequest, NextApiResponse } from "next";

import { sendError, sendSuccess } from "@/lib/api";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return sendError(res, "METHOD_NOT_ALLOWED", "Only GET is allowed.");
  }

  return sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    module: "foundation",
  });
}
