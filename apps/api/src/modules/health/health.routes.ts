import { Router } from "express";
import { ok } from "../../utils/response";
import { catalogMeta } from "../products/products.service";

export const healthRouter = Router();

/**
 * Uptime monitor + deploy check. Envelope baaki API jaisa hi hai
 * (`{ data: ... }`) taaki clients ko do shapes na seekhne pade.
 */
healthRouter.get("/health", (_req, res) =>
  ok(res, {
    status: "ok",
    service: "noor-api",
    products: catalogMeta().productCount,
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  }),
);
