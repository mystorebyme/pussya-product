/**
 * Shipping / payment line.
 *
 * R41 (owner): "Free Shipping" claim **poori site se hata di** — is liye ye line
 * ab sirf sach bolti hai: prepaid order, dispatch aur delivery time. Sheet ka
 * `free_shipping` key contract me hai (data), par UI par koi free-shipping claim
 * nahi dikhta.
 */
export function ShippingNote({
  className = "",
  withDelivery = true,
}: {
  className?: string;
  withDelivery?: boolean;
}) {
  return (
    <span className={className} data-testid="shipping-note">
      {"Prepaid only · dispatch in 1–2 days"}
      {withDelivery ? " · 4–7 day delivery" : ""}
    </span>
  );
}
