import type { NextConfig } from "next";

/**
 * Preview/dev hosts: Arena sandbox previews serve the app from
 * `https://<port>-<sandbox>.e2b.app`, jo Next dev ka HMR resource block kar deta hai
 * jab tak host allowlist me na ho. Production build par iska koi asar nahi.
 */
const devOrigins = ["localhost:3001", "127.0.0.1:3001", "*.e2b.app", "3001-iu4hlpxjms5r4hq5t841e.e2b.app"];

const nextConfig: NextConfig = {
  transpilePackages: ["@noor/types", "@noor/validation", "@noor/ui"],
  allowedDevOrigins: devOrigins,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
