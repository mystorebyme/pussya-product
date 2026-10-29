import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetail } from "@/components/product-detail";
import { ProductReviews, Stars } from "@/components/product-reviews";
import { reviewsFor } from "@/lib/reviews";
import { ProductGrid } from "@/components/product-card";
import { colourOptionsFor, getProduct, getRelatedProducts, products } from "@/lib/store";
import { categoryHref, categoryLabel } from "@/lib/categories";
import { siteConfig } from "@/config/site";

// har product build time par static HTML ban jaata hai -> instant page loads
export async function generateStaticParams() {
  return products.map((product) => ({ handle: product.handle }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description: product.description,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      title: `${product.title} | ${siteConfig.name}`,
      description: product.description,
      url: `/products/${product.handle}`,
      type: "website",
      images: product.images.slice(0, 2),
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 4);
  const reviewBlock = reviewsFor(product.handle);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.slice(0, 3),
    description: product.description,
    sku: product.handle,
    brand: { "@type": "Brand", name: "Noor Ethnic Wear" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteConfig.url}/products/${product.handle}`,
    },
    // rating 0 (sirf count, average nahi) par schema.org ka aggregateRating invalid hota hai
    ...(reviewBlock.count > 0 && reviewBlock.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewBlock.rating.toFixed(1),
            reviewCount: reviewBlock.count,
          },
        }
      : {}),
  };

  // breadcrumb schema — Google result me "Home › Anarkali Suit › Product" dikhta hai
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteConfig.url}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryLabel(product.category),
        item: `${siteConfig.url}${categoryHref(product.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `${siteConfig.url}/products/${product.handle}`,
      },
    ],
  };

  return (
    <div className="container-noor py-6 lg:py-9">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9c8f82]">
          <li>
            <Link href="/" className="hover:text-[#862222]">Home</Link>
          </li>
          <li>/</li>
          <li>
            <Link href={categoryHref(product.category)} className="hover:text-[#862222]">
              {categoryLabel(product.category)}
            </Link>
          </li>
          <li>/</li>
          <li className="line-clamp-1 text-[#5c534b]">{product.title}</li>
        </ol>
      </nav>

      <ProductDetail
        product={product}
        colours={colourOptionsFor(product)}
        rating={reviewBlock.rating}
        reviewCount={reviewBlock.count}
      />

      <ProductReviews block={reviewBlock} productTitle={product.title} productHandle={product.handle} />

      <section className="mt-14 border-t border-[#eee6de] pt-9">
        <div className="text-center">
          <h2 className="font-display text-[24px] font-medium tracking-[.03em] sm:text-[28px]">
            You may also like
          </h2>
          <p className="mt-1 text-[11px] tracking-[.14em] text-[#9c8f82] uppercase">
            Handpicked from the same edit
          </p>
        </div>
        <div className="mt-6">
          <ProductGrid products={related} />
        </div>
      </section>
    </div>
  );
}
