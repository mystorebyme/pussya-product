import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; perPage: number; total: number },
) {
  return res.json({
    data,
    page: meta.page,
    perPage: meta.perPage,
    total: meta.total,
    totalPages: Math.max(1, Math.ceil(meta.total / meta.perPage)),
  });
}

export function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ error: { code, message, details } });
}
