import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ERROR_CODES } from "../constants";
import { fail } from "../utils/response";

/** Admin API token (Phase 2 me short-lived JWT + refresh rotation) */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== env.adminToken) {
    return fail(res, 401, ERROR_CODES.unauthorized, "Admin token required");
  }
  return next();
}
