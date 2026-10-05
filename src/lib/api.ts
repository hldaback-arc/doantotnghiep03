import type { NextApiResponse } from "next";

/* Standard success envelope shared by every Pages API route. */
export type ApiEnvelope<T> = {
  success: true;
  data: T;
  meta: {
    requestId: string;
  };
};

/* Standard error envelope keeps validation details and request tracing consistent. */
export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
  meta: {
    requestId: string;
  };
};

/* Sends typed success data with a request ID and optional creation status. */
export function sendSuccess<T>(
  res: NextApiResponse<ApiEnvelope<T> | ApiErrorEnvelope>,
  data: T,
  statusCode = 200,
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  return res.status(statusCode).json({
    success: true,
    data,
    meta: { requestId },
  });
}

/* Maps API errors to HTTP status codes without exposing internal exceptions. */
export function sendError(
  res: NextApiResponse<ApiEnvelope<unknown> | ApiErrorEnvelope>,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
  statusOverride?: number,
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const statusCode = statusOverride ??
    (code === "VALIDATION_ERROR" ? 400 : code === "METHOD_NOT_ALLOWED" ? 405 : 500);

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
    meta: { requestId },
  });
}
