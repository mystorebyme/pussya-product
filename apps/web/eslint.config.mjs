import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 native flat config export karta hai (array).
 * Pehle FlatCompat + `compat.extends("next/core-web-vitals")` use hota tha —
 * wo eslint 9.39 par "Converting circular structure to JSON" se crash karta
 * tha (matlab lint kabhi chalta hi nahi tha), isliye direct flat config.
 */
const config = [
  /**
   * Build output lint se bahar: `.next` (Next), `.cloudflare`/`.vinext` (vinext ka
   * worker bundle) aur `out` (GitHub Pages static export).
   *
   * ⚠️ Flat config me **global** ignore sirf tab hota hai jab object me `ignores`
   * akela ho (rules ke saath likhne wo sirf us object ke liye exclude hota hai).
   * Pehle `.next/**` rules wale object me tha, isliye minified bundle lint ho raha
   * tha — `vite build` ke baad `npm run lint` 27 rules-of-hooks **error** deta tha
   * jabki asli code saaf tha.
   */
  {
    ignores: [
      ".next/**",
      ".cloudflare/**",
      ".vinext/**",
      "out/**",
      "src/data/catalog.json",
      "public/catalog-lite.json",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      /**
       * Cart/wishlist/compare/settings localStorage me rehte hain. Server par wo
       * nahi hote, isliye mount ke baad effect me padhna hi sahi tareeka hai
       * (warna hydration mismatch). Rule error se warning kiya — asli bug nahi
       * hai, par naya galti se likha gaya cascade pakadne ke liye warning
       * rehne dete hain.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
