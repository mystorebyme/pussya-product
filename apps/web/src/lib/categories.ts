import type { ProductCategory } from "@noor/types";

/**
 * Category ka display naam + collection link ek hi jagah se — PDP, cards aur
 * breadcrumbs sab yahi use karte hain, isliye copy kabhi mismatch nahi hoti.
 */
const CATEGORY_LABELS: Record<ProductCategory, string> = {
  anarkali: "Anarkali Suit",
  lehnga: "Lehenga Choli",
  printed: "Printed Suit Set",
  saree: "Saree",
  gown: "Gown",
  sharara: "Sharara Suit Set",
  other: "Suit Set",
};

const CATEGORY_LINKS: Record<ProductCategory, string> = {
  anarkali: "/collections/party-wear-gown",
  lehnga: "/collections/lehnga-choli",
  printed: "/collections/printed-suit-set",
  saree: "/collections/saree",
  gown: "/collections/party-wear-gown",
  sharara: "/collections/party-wear-gown",
  other: "/collections/new-arrivals",
};

export function categoryLabel(category: ProductCategory): string {
  return CATEGORY_LABELS[category] ?? "Suit Set";
}

export function categoryHref(category: ProductCategory): string {
  return CATEGORY_LINKS[category] ?? "/collections/new-arrivals";
}
