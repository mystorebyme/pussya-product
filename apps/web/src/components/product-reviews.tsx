"use client";

import { useMemo, useState } from "react";
import { SafeImage } from "@/components/safe-image";
import { Stars } from "@/components/stars";
import { productUrl } from "@/lib/whatsapp";
import { ratingBreakdown, type ProductReviewBlock, type Review } from "@/lib/reviews";
import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

/**
 * Product reviews — live store ke Trustoo widget jaisa layout:
 * bada average + stars, 5★→1★ distribution bars, photo reviews ka carousel,
 * aur verified buyer review cards. Data daily sync se aata hai.
 */
export function ProductReviews({
  block,
  productTitle,
  productHandle,
}: {
  block: ProductReviewBlock;
  productTitle: string;
  productHandle: string;
}) {
  const { whatsapp } = useStoreSettings();
  const [filter, setFilter] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const breakdown = useMemo(() => ratingBreakdown(block), [block]);
  const photos = useMemo(
    () => block.reviews.flatMap((review) => (review.photos ?? []).map((src) => ({ src, review }))),
    [block],
  );
  const visible = filter ? block.reviews.filter((review) => Math.round(review.rating) === filter) : block.reviews;

  const wa = whatsapp.replace(/\D/g, "").slice(-10);
  const whatsappReview = `https://wa.me/${whatsappNumber(wa)}?text=${encodeURIComponent(
    `Hi Noor Ethnic Wear! I'd like to review "${productTitle}" (${productUrl(productHandle)}). My rating: `,
  )}`;

  return (
    <section className="mt-10 border-t border-[#eee6de] pt-8" data-testid="product-reviews" id="reviews">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-medium sm:text-[28px]">Customer reviews</h2>
          <p className="mt-1 text-[11px] tracking-[.12em] text-[#9c8f82] uppercase">
            {block.count > 0 ? `${block.count} customer reviews` : "Be the first to review this piece"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="border border-[#862222] px-5 py-2.5 text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
        >
          Write a review
        </button>
      </div>

      {showForm ? (
        <p className="mt-3 border border-[#eee6de] bg-[#faf8f5] p-4 text-[12.5px] leading-relaxed text-[#5c534b]">
          Send your review on WhatsApp — our team publishes it within 24 hours.{" "}
          <a href={whatsappReview} target="_blank" rel="noopener noreferrer" className="font-medium text-[#862222] underline">
            Write a review on WhatsApp
          </a>
        </p>
      ) : null}

      {block.count === 0 ? (
        <div className="mt-5 border border-[#eee6de] px-5 py-10 text-center">
          <Stars value={0} size={18} />
          <p className="mt-2 text-[12.5px] text-[#6b6259]">
            There are no reviews on this piece yet. Yours can be the first.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-6 border border-[#eee6de] p-5 sm:grid-cols-[210px_1fr]">
            <div className="text-center sm:border-r sm:border-[#f1ebe5] sm:pr-5">
              {block.rating > 0 ? (
                <>
                  <p className="font-display text-[44px] leading-none text-[#862222]">{block.rating.toFixed(1)}</p>
                  <Stars value={block.rating} size={16} />
                </>
              ) : (
                <p className="font-display text-[20px] leading-none text-[#862222]">{block.count} ratings</p>
              )}
              <p className="mt-1.5 text-[11.5px] text-[#6b6259]">Based on {block.count} reviews</p>
            </div>
            <div className="space-y-1.5">
              {block.reviews.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-[#6b6259]">
                  This piece has {block.count} ratings. Customer-written reviews appear here as they come in —
                  we never publish sample reviews.
                </p>
              ) : null}
              {block.reviews.length === 0 ? null : breakdown.map((row) => (
                <button
                  key={row.stars}
                  type="button"
                  onClick={() => setFilter(filter === row.stars ? null : row.stars)}
                  className={`flex w-full items-center gap-2 text-left text-[11.5px] transition ${
                    filter === row.stars ? "text-[#862222]" : "text-[#6b6259] hover:text-[#862222]"
                  }`}
                >
                  <span className="w-7">{row.stars}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1ebe5]">
                    <span className="block h-full rounded-full bg-[#c9a86a]" style={{ width: `${row.percent}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums">{row.count}</span>
                </button>
              ))}
              {filter ? (
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className="text-[10.5px] tracking-[.1em] text-[#862222] uppercase underline"
                >
                  Clear filter
                </button>
              ) : null}
            </div>
          </div>

          {photos.length > 0 ? (
            <div className="mt-6">
              <p className="text-[10.5px] font-semibold tracking-[.14em] text-[#8a8078] uppercase">Customer photos</p>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {photos.map(({ src, review }) => (
                  <figure key={`${review.id}-${src}`} className="w-[104px] shrink-0">
                    <SafeImage src={src} alt="" className="h-[132px] w-full object-cover" />
                    <figcaption className="mt-1 text-[10px] text-[#8a8078]">{review.author}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}

          <ul className="mt-6 space-y-4">
            {visible.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <li className="border border-[#eee6de] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-medium">{review.author}</span>
        {review.verified === true ? (
          <span className="bg-[#eaf5ec] px-1.5 py-0.5 text-[9px] font-semibold tracking-[.08em] text-[#2f7a3f] uppercase">
            Verified buyer
          </span>
        ) : null}
        {review.date ? <span className="text-[10.5px] text-[#9c8f82]">{review.date}</span> : null}
      </div>
      <div className="mt-1.5">
        <Stars value={review.rating} size={13} />
      </div>
      {review.title ? <p className="mt-1.5 text-[12.5px] font-medium">{review.title}</p> : null}
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#5c534b]">{review.body}</p>
      {review.photos?.length ? (
        <div className="mt-2 flex gap-1.5">
          {review.photos.slice(0, 4).map((src) => (
            <SafeImage key={src} src={src} alt="" className="h-16 w-14 object-cover" />
          ))}
        </div>
      ) : null}
    </li>
  );
}

export { Stars } from "@/components/stars";
