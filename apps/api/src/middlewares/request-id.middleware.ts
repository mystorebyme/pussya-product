import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/** Har request ka ID — logs me isi se trace karte hain */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  req.id = incoming && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}
