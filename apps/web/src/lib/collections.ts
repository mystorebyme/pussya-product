/**
 * Client-safe collection list (sirf handle/title/subtitle — chhota payload).
 * Poora catalog (287 products, ~400KB) sirf server par load hota hai.
 */
export const navigationCollections = [
  { handle: "party-wear-gown", title: "Anarkali Suit", subtitle: "Designer Anarkali Suits" },
  { handle: "new-arrivals", title: "New Arrivals", subtitle: "Freshly dropped festive favourites" },
  { handle: "noors-choice", title: "Noor's Choice", subtitle: "Handpicked by our stylists" },
  { handle: "lehnga-choli", title: "Lehenga Choli", subtitle: "Our Range of Designer Lehnga Choli" },
  { handle: "printed-suit-set", title: "Printed Suit Set", subtitle: "Everyday ethnic ease" },
  { handle: "sale", title: "Sale", subtitle: "Limited-time festive prices" },
  { handle: "wedding-collection", title: "Wedding Collection", subtitle: "Bridal & trousseau edit" },
  { handle: "trending", title: "Trending", subtitle: "The styles selling out this week" },
] as const;

export type NavigationCollection = (typeof navigationCollections)[number];
