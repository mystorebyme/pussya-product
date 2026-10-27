import type { NextConfig } from "next";

/** Next dev sirf allowlisted hosts se HMR allow karta hai — sandbox preview isi list se aata hai. */
const devOrigins = ["localhost:3000", "127.0.0.1:3000", "*.e2b.app", "3000-iu4hlpxjms5r4hq5t841e.e2b.app"];

/** GitHub Pages par sirf static preview (browse). Poora site Render par chalta hai. */
const preview = process.env.PAGES_PREVIEW === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(preview
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
      }
    : {}),
  // shared packages ko TS source se compile karna hai (no separate build step)
  transpilePackages: ["@noor/types", "@noor/validation", "@noor/api-client", "@noor/ui"],
  allowedDevOrigins: devOrigins,
  // pdfkit native-style deps (fontkit) bundle karna theek nahi — runtime par node_modules se load
  serverExternalPackages: ["pdfkit"],
  images: {
    // product images Shopify CDN se aate hain. <img> use karte hain kyunki
    // direct CDN hit browser se hota hai -> Next server ka bandwidth zero.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      // Trustoo reviews ke customer photos
      { protocol: "https", hostname: "img.trustoo.io" },
    ],
    ...(preview ? { unoptimized: true } : {}),
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    if (preview) return [];
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // browsers sirf https par maante hain — localhost par ignore ho jaata hai
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // report-only pehle: violations dekho, phir enforce karo (docs/07-security/headers-and-csp.md)
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "img-src 'self' https://cdn.shopify.com https://*.shopifycdn.com data: blob:",
              // koi third-party payment gateway nahi (owner rule) — sirf apni site
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      {
        source: "/:path*.(png|jpg|jpeg|webp|svg|ico|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
