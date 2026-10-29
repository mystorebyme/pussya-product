/**
 * @noor/ui — shared primitives (admin me use hote hain; web ke apne
 * design-system components hain kyunki storefront ka look alag hai).
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const badgeTone = {
  neutral: "badge",
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
} as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Failed",
  cod: "COD",
  refunded: "Refunded",
};
