import Link from "next/link";
import { latestReviews, shopRating } from "@/lib/reviews";
import { Stars } from "@/components/stars";

/**
 * Home par customer reviews strip — live store ke Trustoo carousel jaisa.
 * Reviews sync hone par hi dikhta hai (koi dummy review nahi).
 */
export function ReviewsStrip() {
  const reviews = latestReviews(6);
  if (!reviews.length) return null;

  return (
    <section className="bg-[#faf6f1] py-12" data-testid="home-reviews">
      <div className="container-noor">
        <div className="text-center">
          <h2 className="font-display text-[26px] font-medium tracking-[.03em] sm:text-[32px]">
            Loved by our customers
          </h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Stars value={shopRating.rating || 5} size={16} />
            <span className="text-[12px] text-[#6b6259]">
              {(shopRating.rating || 5).toFixed(1)} / 5 · {shopRating.count} reviews
            </span>
          </div>
        </div>

        <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2">
          {reviews.map((review) => (
            <figure
              key={`${review.productHandle}-${review.id}`}
              className="w-[260px] shrink-0 border border-[#e9dfd4] bg-white p-4 sm:w-[300px]"
            >
              <Stars value={review.rating} size={14} />
              {review.title ? <p className="mt-2 text-[12.5px] font-medium">{review.title}</p> : null}
              <blockquote className="mt-1 line-clamp-4 text-[12px] leading-relaxed text-[#5c534b]">
                {review.body}
              </blockquote>
              <figcaption className="mt-2 flex items-center justify-between text-[10.5px] text-[#8a8078]">
                <span>{review.author}</span>
                {review.productHandle ? (
                  <Link href={`/products/${review.productHandle}`} className="text-[#862222] underline">
                    View piece
                  </Link>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
