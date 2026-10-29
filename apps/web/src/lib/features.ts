/**
 * Customer-facing features jo owner ke kehne par on/off hote hain.
 *
 * `invoice` — R32 (26 Oct 2026): owner ne kaha "invoice download abhi band karo,
 * sirf tracking dikhe". Isliye customer ke order page se GST invoice ka block
 * hata diya hai. **PDF/API pehle jaisa chalta hai** (admin panel ka
 * "Download GST invoice (PDF)" button aur `/api/orders/<n>/invoice`), taaki
 * owner ko invoice chahiye to milta rahe.
 *
 * Dobara customer ko dikhana ho to sirf `invoice: true` kar dena — koi aur
 * jagah badalne ki zaroorat nahi.
 */
export const customerFeatures = {
  invoice: false,
} as const;
