import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";
import { ERROR_CODES } from "../constants";
import { fail } from "../utils/response";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = ERROR_CODES.internal,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  return fail(res, 404, ERROR_CODES.notFound, "Route not found");
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return fail(res, error.status, error.code, error.message, error.details);
  }
  logger.error("unhandled_error", {
    requestId: req.id,
    message: error instanceof Error ? error.message : String(error),
  });
  return fail(res, 500, ERROR_CODES.internal, "Something went wrong. Please try again.");
}
