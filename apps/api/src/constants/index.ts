export { ORDER_STATUSES } from "@noor/validation";

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "cod", "refunded"] as const;

export const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  notFound: "NOT_FOUND",
  rateLimited: "RATE_LIMITED",
  unauthorized: "UNAUTHORIZED",
  codNotAllowed: "COD_NOT_ALLOWED",
  invalidTransition: "INVALID_TRANSITION",
  invalidItem: "INVALID_ITEM",
  couponInvalid: "COUPON_INVALID",
  providerUnavailable: "PROVIDER_UNAVAILABLE",
  internal: "INTERNAL_ERROR",
} as const;

export const RATE_LIMITS = {
  orders: { windowMs: 60_000, max: 10 },
  contact: { windowMs: 60_000, max: 5 },
  login: { windowMs: 15 * 60_000, max: 10 },
} as const;
