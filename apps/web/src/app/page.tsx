import Link from "next/link";
import type { Metadata } from "next";
import { RotatingRail } from "@/components/rotating-rail";
import { CategoryCircles } from "@/components/category-circles";
import { ReviewsStrip } from "@/components/reviews-strip";
import { EditorialBand, OccasionStrip } from "@/components/occasion-strip";
import { Reveal } from "@/components/reveal";
import { getProducts, getCollection } from "@/lib/store";
import { RAILS, type RailKey, railPool } from "@/lib/rails";
import { compactProduct, rotatePick, rotationBucket } from "@/lib/rotation";
import { bestSellers } from "@/lib/best-sellers";
import { BestSellersRail } from "@/components/best-sellers-rail";
import { imageUrl } from "@/lib/format";
import { heroBannerSizes, heroBanners, siteConfig } from "@/config/site";
import { SafeImage } from "@/components/safe-image";
import { ShippingNote } from "@/components/shipping-note";

/** Home ke rails har 10 minute me badalte hain — page bhi utni hi der me refresh hota hai */
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Noor Ethnic Wear | Designer Anarkali Suits, Lehenga Choli & Suit Sets",
  description:
    "Shop designer Anarkali suits, lehanga choli and printed suit sets at Noor Ethnic Wear. Hand-finished pieces, secure prepaid UPI checkout and express delivery.",
  alternates: { canonical: "/" },
};

/**
 * Festive home banner — owner ke diye hue teen Diwali posters (desktop / tablet /
 * mobile), har breakpoint ki **apni** art.
 *
 * Owner rule (R41): koi crop nahi, koi stretch nahi — logo, "UP TO 75% OFF",
 * "SHOP NOW", "Secure Payment", "Easy Returns" teeno screens par poore dikhein.
 * Isliye:
 *   • <picture> se device ke hisaab se alag file (ek hi download hoti hai),
 *   • wrapper ka `aspect-ratio` us file ke **exact** ratio ke barabar
 *     (`heroBannerSizes` se), aur image `object-fit: contain` — isliye kabhi
 *     kuch nahi kat-ta, sirf poster poora fit hota hai
 *   • desktop par poster poori width leta hai (max 1920px container).
 */
const HERO_HREF = "/collections/sale";

export default async function HomePage() {
  const products = await getProducts();
  const byCollection = (handle: string) => products.filter((product) => product.collections.includes(handle));

  /**
   * Har rail ka set 10-minute window se banta hai (server par bhi wahi algorithm
   * jo client par hai) — refresh par naye products, aur client bhi 10 min me
   * khud badal jaata hai.
   */
  const bucket = rotationBucket();
  const rail = (key: RailKey) => {
    const pool = railPool(key, products);
    const picks = rotatePick(pool, `${key}:${bucket}`, RAILS[key].count);
    return {
      initial: picks.map(compactProduct),
      // fallback pool (static preview ke liye) — chhota rakha hai
      pool: rotatePick(pool, `pool:${bucket}`, 24).map(compactProduct),
    };
  };
  const trendy = rail("trendy");
  const newArrivalsRail = rail("newArrivals");
  const lehnga = rail("lehnga");
  const explore = rail("explore");

  // best sellers — asli orders se ranked (orders empty ho to curated edit)
  const bestSellerPicks = (await bestSellers(8)).map(({ product }) => compactProduct(product));

  const anarkaliCollection = await getCollection("party-wear-gown");
  const lehngaCollection = await getCollection("lehnga-choli");
  const printedCollection = await getCollection("printed-suit-set");
  const newArrivalsCollection = await getCollection("new-arrivals");
  const saleCollection = await getCollection("sale");
  const choiceCollection = await getCollection("noors-choice");
  const weddingCollection = await getCollection("wedding-collection");

  /**
   * R37 (owner): "wedding wale circle me image nahi dikh rhi" — pehle Wedding ka
   * image hardcoded `undefined` tha, isliye circle khaali beige ring dikhta tha.
   * Ab har circle ka image collection se aata hai, aur collection me image na ho
   * to us collection ka **pehla product photo** fallback (circle kabhi khaali nahi).
   */
  const circleImage = (collection: { image?: string | null } | undefined, handle: string) =>
    collection?.image ?? byCollection(handle)[0]?.images[0] ?? null;

  // "Shop by edit" circles — ek line me, live store ka style
  const circleItems = [
    { href: "/collections/party-wear-gown", title: "Anarkali Suit", image: circleImage(anarkaliCollection, "party-wear-gown"), count: byCollection("party-wear-gown").length },
    { href: "/collections/lehnga-choli", title: "Lehnga Choli", image: circleImage(lehngaCollection, "lehnga-choli"), count: byCollection("lehnga-choli").length },
    { href: "/collections/printed-suit-set", title: "Printed Suit Set", image: circleImage(printedCollection, "printed-suit-set"), count: byCollection("printed-suit-set").length },
    { href: "/collections/new-arrivals", title: "New Arrivals", image: circleImage(newArrivalsCollection, "new-arrivals"), count: byCollection("new-arrivals").length },
    { href: "/collections/noors-choice", title: "Noor's Choice", image: circleImage(choiceCollection, "noors-choice"), count: byCollection("noors-choice").length },
    { href: "/collections/sale", title: "Sale", image: circleImage(saleCollection, "sale"), count: byCollection("sale").length },
    { href: "/collections/wedding-collection", title: "Wedding", image: circleImage(weddingCollection, "weddin-collection"), count: byCollection("weddin-collection").length },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: siteConfig.name,
    url: siteConfig.url,
    image: siteConfig.ogImage,
    description: siteConfig.description,
    // khaali value schema me nahi bhejte (number/email sirf owner settings/Sheet se)
    ...(siteConfig.phone ? { telephone: siteConfig.phone } : {}),
    ...(siteConfig.email ? { email: siteConfig.email } : {}),
    // owner request: public page par local address nahi (sirf country)
    address: { "@type": "PostalAddress", addressCountry: "IN" },
    priceRange: "₹499 - ₹699",
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── hero banner: device-specific festive poster (mobile / tablet / desktop) ── */}
      <section className="relative bg-[#fbf1e2]" data-testid="hero-banner" aria-label="Diwali Sale — up to 75% off">
        <div className="mx-auto w-full max-w-[1920px]">
          {/*
            data-hero + CSS (.hero-media) me per-breakpoint aspect-ratio:
            mobile 941/1672 · tablet + desktop 1672/941 — asli files
            ke ratio hain, isliye crop/stretch dono zero.
          */}
          <Link
            href={HERO_HREF}
            aria-label="Shop the Diwali sale — up to 75% off"
            className="hero-media block w-full bg-[#fbf1e2]"
          >
            <picture>
              <source media="(min-width:1024px)" srcSet={heroBanners.desktop} />
              <source media="(min-width:768px)" srcSet={heroBanners.tablet} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroBanners.mobile}
                alt="Noor Ethnic Wear Diwali Sale — up to 75% off, secure payment and easy returns"
                width={heroBannerSizes.mobile.width}
                height={heroBannerSizes.mobile.height}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </Link>

          {/* SEO h1 + quick actions — poster par text pehle se hai, isliye chhota strip */}
          <div className="container-noor flex flex-col items-center gap-3 border-b border-[#efe2cf] py-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h1 className="font-display text-[20px] leading-tight font-medium text-[#5c1010] sm:text-[24px]">
                Diwali Sale — Up to <span className="text-[#862222]">75%</span> Off
              </h1>
              <p className="mt-1 text-[11px] text-[#7b6f64]">
                <ShippingNote />
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                href="/collections/sale"
                className="inline-flex h-11 items-center justify-center bg-[#862222] px-7 text-[11px] font-semibold tracking-[.16em] text-white uppercase transition hover:bg-[#6d1b1b]"
              >
                Shop the sale
              </Link>
              <Link
                href="/collections/new-arrivals"
                className="inline-flex h-11 items-center justify-center border border-[#862222] px-7 text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
              >
                New arrivals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CategoryCircles items={circleItems} />

      <ProductRail rail="trendy" products={trendy.initial} pool={trendy.pool} />

      <BestSellersRail initial={bestSellerPicks} />

      <ProductRail rail="newArrivals" products={newArrivalsRail.initial} pool={newArrivalsRail.pool} />

      <ProductRail rail="lehnga" products={lehnga.initial} pool={lehnga.pool} />

      <ReviewsStrip />

      <ProductRail rail="explore" products={explore.initial} pool={explore.pool} />
      <OccasionStrip />
      <EditorialBand />

    </div>
  );
}

function ProductRail({
  rail,
  products,
  pool,
}: {
  rail: RailKey;
  products: Awaited<ReturnType<typeof getProducts>>;
  pool: Awaited<ReturnType<typeof getProducts>>;
}) {
  const { title, subtitle, href } = RAILS[rail];
  if (!products.length) return null;
  return (
    <section className="container-noor py-10 lg:py-14">
      <Reveal className="flex flex-col items-center">
        <h2 className="font-display text-[26px] leading-tight font-medium tracking-[.03em] text-[#2f2a25] sm:text-[32px]">
          {title}
        </h2>
        <p className="mt-1 text-[11.5px] tracking-[.14em] text-[#9c8f82] uppercase">{subtitle}</p>
      </Reveal>
      <Reveal className="mt-7" delay={80}>
        <RotatingRail rail={rail} initial={products} pool={pool} perView={3} />
      </Reveal>
      <div className="mt-8 flex justify-center">
        <Link
          href={href}
          className="border border-[#862222] px-9 py-3 text-[11px] font-semibold tracking-[.18em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
        >
          View All
        </Link>
      </div>
    </section>
  );
}
