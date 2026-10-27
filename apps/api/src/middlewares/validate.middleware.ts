import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ERROR_CODES } from "../constants";
import { fail } from "../utils/response";

/** Shared zod schema se hi API validate hoti hai (frontend bhi wahi schema use karta hai) */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return fail(res, 400, ERROR_CODES.validation, first?.message ?? "Invalid input", {
        path: first?.path,
      });
    }
    req.body = parsed.data;
    next();
  };
}
