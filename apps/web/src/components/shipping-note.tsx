"use client";

import { useStoreSettings } from "@/components/store-settings-provider";

/**
 * Shipping / payment line — **sheet se live**.
 *
 * Owner Google Sheet me `free_shipping` / announcement badalta hai to ye line
 * har jagah (home, checkout, cart, PDP) wahi dikhati hai. Koi hardcoded
 * "free shipping" text nahi.
 */
export function ShippingNote({
  className = "",
  withDelivery = true,
}: {
  className?: string;
  withDelivery?: boolean;
}) {
  const { freeShipping } = useStoreSettings();
  return (
    <span className={className} data-testid="shipping-note">
      {freeShipping ? "Free shipping pan-India" : "Shipping charges checkout par"}
      {" · Prepaid only"}
      {withDelivery ? " · 4–7 day delivery" : ""}
    </span>
  );
}
