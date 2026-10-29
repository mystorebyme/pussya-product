import type { Request, Response } from "express";
import { fail, ok, paginated } from "../../utils/response";
import { ERROR_CODES } from "../../constants";
import * as service from "./orders.service";
import type { CreateOrderInput } from "@noor/validation";
import type { OrderStatus } from "@noor/types";

export function create(req: Request, res: Response) {
  const order = service.create(req.body as CreateOrderInput);
  return ok(res, order, 201);
}

export function detail(req: Request, res: Response) {
  const order = service.findByNumber(String(req.params.orderNumber ?? ""));
  if (!order) return fail(res, 404, ERROR_CODES.notFound, "Order not found");
  return ok(res, order);
}

export function list(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 20) || 20));
  const rows = service.listOrders(status);
  return paginated(res, rows.slice((page - 1) * perPage, page * perPage), {
    page,
    perPage,
    total: rows.length,
  });
}

export function update(req: Request, res: Response) {
  const { status, note } = req.body as { status: OrderStatus; note?: string };
  return ok(res, service.updateStatus(String(req.params.orderNumber ?? ""), status, "admin", note));
}

export function dashboard(_req: Request, res: Response) {
  return ok(res, service.stats());
}
