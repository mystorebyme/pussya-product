import Script from "next/script";
import { PageViewTracker } from "@/components/page-view-tracker";

/**
 * Traffic tracking — owner ko "kitna traffic aaya, kaha se aaya" dikhna chahiye.
 *
 * Do layer, dono free:
 *   1. **Vercel Web Analytics + Speed Insights** — Vercel dashboard me page views,
 *      visitors, top pages, devices aur Core Web Vitals. Vercel par deploy hote hi
 *      apne aap chalta hai (project me Analytics "Enable" karna hota hai).
 *   2. **Google Analytics 4** (optional) — `NEXT_PUBLIC_GA_ID` env set karte hi
 *      gtag lag jaata hai. Search Console ke saath milke poora traffic picture.
 *
 * Koi cookie banner zaroori nahi (GA4 ko anonymous mode me chalate hain —
 * IP anonymize + no ad personalisation).
 */
export function Analytics() {
  const gaId = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();
  const onVercel = Boolean(process.env.VERCEL);

  return (
    <>
      {/* apna counter — har page view admin → Traffic me (dashboard toggle ke bina) */}
      <PageViewTracker />

      {onVercel ? (
        <>
          {/* Vercel Web Analytics — page views / visitors */}
          <Script id="vercel-web-analytics" strategy="afterInteractive">
            {`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}
          </Script>
          <Script src="/_vercel/insights/script.js" strategy="afterInteractive" data-sdkn="@vercel/analytics" />
          {/* Vercel Speed Insights — page speed (Core Web Vitals) */}
          <Script id="vercel-speed-insights" strategy="afterInteractive">
            {`window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };`}
          </Script>
          <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
        </>
      ) : null}

      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}
    </>
  );
}
