import type { Request, Response } from "express";
import { paginated, ok, fail } from "../../utils/response";
import { ERROR_CODES } from "../../constants";
import * as service from "./products.service";

export function list(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const perPage = Math.min(60, Math.max(1, Number(req.query.perPage ?? 24) || 24));
  const { items, total } = service.listProducts({
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    collection: typeof req.query.collection === "string" ? req.query.collection : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
    page,
    perPage,
  });
  return paginated(res, items, { page, perPage, total });
}

export function detail(req: Request, res: Response) {
  const product = service.findProduct(String(req.params.handle ?? ""));
  if (!product) return fail(res, 404, ERROR_CODES.notFound, "Product not found");
  return ok(res, product);
}

export function collections(_req: Request, res: Response) {
  return ok(res, service.listCollections());
}

export function meta(_req: Request, res: Response) {
  return ok(res, service.catalogMeta());
}
