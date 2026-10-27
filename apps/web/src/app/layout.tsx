import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingHelp } from "@/components/floating-help";
import { WishlistProvider } from "@/components/wishlist-provider";
import { StoreSettingsProvider } from "@/components/store-settings-provider";
import { StoreStructuredData } from "@/components/store-structured-data";
import { Analytics } from "@/components/analytics";
import { brandAssets, logoMark, siteConfig } from "@/config/site";
import { assetUrl } from "@/lib/format";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: "Noor Ethnic Wear",
  // browser tab / home-screen icon — owner ka brand mark (local asset)
  icons: {
    icon: [
      { url: brandAssets.mark128, sizes: "128x128", type: "image/png" },
      { url: brandAssets.mark192, sizes: "192x192", type: "image/png" },
      { url: logoMark, sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: logoMark }],
    apple: [{ url: brandAssets.mark192, sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Noor Ethnic Wear", statusBarStyle: "default" },
  manifest: assetUrl("/manifest.webmanifest"),
  title: {
    default: "Noor Ethnic Wear | Designer Anarkali Suits, Lehenga Choli & Suit Sets",
    template: "%s | Noor Ethnic Wear",
  },
  description:
    "Shop premium designer Anarkali suits, lehenga choli and printed suit sets at Noor Ethnic Wear. Secure prepaid UPI checkout and 7 days easy replacement.",
  keywords: [
    "designer anarkali suits",
    "lehenga choli online",
    "printed suit set",
    "party wear gown",
    "noor clothing",
  ],
  openGraph: {
    title: "Noor Ethnic Wear | Designer Anarkali Suits",
    description:
      "Premium designer Anarkali suits, lehengas and printed suit sets crafted for every celebration.",
    type: "website",
    url: siteConfig.url,
    siteName: "Noor Ethnic Wear",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Noor Ethnic Wear" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  /**
   * Google Search Console — owner ka verification tag.
   * (Backup: `public/googleb3b0e3defc1daa17.html` bhi serve hota hai, dono method
   * se verification pass ho jayega.)
   */
  verification: { google: "hFaqyp-9LdUXSKPA9RF011TkO2m_-7AUMasXqm_0dGI" },
};

export const viewport: Viewport = {
  themeColor: "#862222",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap"
        />
      </head>
      <body className="text-[#2f2a25]">
        {/* JS band ho to scroll-reveal content chhupna nahi chahiye */}
        <noscript>
          <style>{".reveal-init{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        {/* Site-wide structured data — Google ko brand, site aur search box ka pata chale */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": `${siteConfig.url}#org`,
                name: siteConfig.name,
                url: siteConfig.url,
                logo: `${siteConfig.url}${brandAssets.mark}`,
                // email/telephone StoreStructuredData se aate hain (settings-driven)
                sameAs: [siteConfig.socials.instagram],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: siteConfig.name,
                url: siteConfig.url,
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${siteConfig.url}/search?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
        <StoreSettingsProvider>
        <CartProvider>
          <WishlistProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[#862222] focus:px-4 focus:py-2 focus:text-[12px] focus:text-white"
            >
              Skip to content
            </a>
            <SiteHeader />
            <main id="main-content" className="min-h-[60vh]">{children}</main>
            <SiteFooter />
            <FloatingHelp />
        {/* traffic tracking — Vercel Analytics + optional GA4 */}
        <Analytics />
          </WishlistProvider>
        </CartProvider>
        </StoreSettingsProvider>
        <StoreStructuredData />
      </body>
    </html>
  );
}
