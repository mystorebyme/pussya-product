import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES } from "../constants";
import { fail } from "../utils/response";

/**
 * Simple in-memory fixed window limiter (single instance).
 * Multi-instance production me Redis store use karo — interface same rehta hai.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("retry-after", Math.ceil((entry.resetAt - now) / 1000));
      return fail(res, 429, ERROR_CODES.rateLimited, "Bahut zyada requests. Thodi der baad try kariye.");
    }
    return next();
  };
}
