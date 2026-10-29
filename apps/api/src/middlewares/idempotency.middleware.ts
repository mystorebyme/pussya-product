import type { NextFunction, Request, Response } from "express";
import { IDEMPOTENCY_TTL_MS } from "@noor/validation";
import { readRows, writeRows } from "../config/data";

/**
 * Idempotency-Key: double click / network retry / mobile reconnect par do order nahi bante.
 * Response disk par TTL ke saath rakha jaata hai — server restart par bhi key zinda rehti hai.
 * Phase 2: Redis SETNX (atomic across instances).
 */
type Record = { key: string; status: number; body: unknown; at: string };

const FILE = "idempotency.json";

function scopedKey(req: Request, key: string): string {
  return `${req.method} ${req.baseUrl}${req.path}::${key}`;
}

function readLive(): Record[] {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
  return readRows<Record>(FILE).filter((row) => new Date(row.at).getTime() > cutoff);
}

export function idempotency(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "POST") return next();
  const header = req.header("idempotency-key")?.trim();
  if (!header) return next();

  const key = scopedKey(req, header.slice(0, 120));
  const cached = readLive().find((row) => row.key === key);
  if (cached) {
    res.setHeader("idempotent-replay", "true");
    return res.status(cached.status).json(cached.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    // 5xx cache nahi karte — client retry kar sake
    if (res.statusCode < 500) {
      const rows = readLive().filter((row) => row.key !== key);
      rows.push({ key, status: res.statusCode, body, at: new Date().toISOString() });
      // file ko chhota rakho (last 500 records)
      writeRows(FILE, rows.slice(-500));
    }
    return originalJson(body);
  };
  return next();
}
