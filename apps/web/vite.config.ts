import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * pdfkit Workers-compat — do chhoti cheezein, dono sirf isi build ke liye:
 *
 * 1. Entry: Vite default me `pdfkit.browser.mjs` / `pdfkit.js` uthata hai jo module
 *    load hote hi `__filename` / `document.baseURI` par jaata hai. Node ESM build
 *    (`pdfkit.node.mjs`) `import.meta.url` use karta hai — Workers ke liye theek.
 * 2. workerd quirk: `new URL('./data/sRGB…icc', import.meta.url)` yahan
 *    `TypeError: Invalid URL string.` deta hai (module-scope evaluation par, isliye
 *    poora invoice route 500 ho jaata tha). PDF/A ka ICC profile hum use nahi karte,
 *    isliye us ek relative URL ko absolute bana dete hain — path wahi rehta hai.
 *
 * Node/Vercel par `next build` chalta hai ( `serverExternalPackages: ["pdfkit"]` ),
 * is config ka asar nahi padta — wahan behaviour bilkul same rehta hai.
 */
const require = createRequire(import.meta.url);
const PDFKIT_NODE_ENTRY = (() => {
  const candidate = join(dirname(require.resolve("pdfkit")), "pdfkit.node.mjs");
  // pdfkit apne `exports` me ye subpath list nahi karta — direct file path.
  return existsSync(candidate) ? candidate : null;
})();
/** Fonts ko absolute path se import karte hain — dev me prebundled path alag hota hai. */
const PDFKIT_FONT_PREFIX = PDFKIT_NODE_ENTRY
  ? dirname(PDFKIT_NODE_ENTRY).split("\\").join("/")
  : "";
const fontImportPath = (name: string) => `${PDFKIT_FONT_PREFIX}/standard-fonts/${name}.mjs`;

/** pdfkit ke 14 standard PDF fonts (js/standard-fonts/*.mjs). */
const PDFKIT_FONTS = [
  "Courier",
  "CourierBold",
  "CourierBoldOblique",
  "CourierOblique",
  "Helvetica",
  "HelveticaBold",
  "HelveticaBoldOblique",
  "HelveticaOblique",
  "Symbol",
  "TimesBold",
  "TimesBoldItalic",
  "TimesItalic",
  "TimesRoman",
  "ZapfDingbats",
] as const;

function pdfkitWorkersCompat(): Plugin {
  return {
    name: "r34-pdfkit-workers-compat",
    enforce: "pre",
    transform(code, id) {
      if (!/pdfkit(\.node)?\.m?js$/.test(id.split("?")[0]!)) return null;
      const patched = code
        // PDF/A ICC profile — absolute URL (use hi nahi hota, par module load par crash hota tha)
        .replace(
          /new URL\(\s*(['"`])\.\/data\/(sRGB_IEC61966_2_1\.icc)\1\s*,\s*import\.meta\.url\s*\)/g,
          'new URL("https://worker.invalid/data/$2")',
        )
        // Standard fonts: pdfkit runtime par `createRequire('#standard-fonts/X')` karta hai,
        // jo Workers me "No such module" deta hai. Unhe static ESM imports se replace
        // karte hain — Vite bundle kar leta hai, metrics bilkul wahi rehte hain.
        .replace(
          /\(\)\s*=>\s*require\$1\(\s*(['"`])#standard-fonts\/([A-Za-z]+)\1\s*\)/g,
          (_match, _quote, name: string) => `() => __r34Font${name}`,
        );

      const fontImports = PDFKIT_FONTS.map(
        (name) => `import __r34Font${name} from "${fontImportPath(name)}";`,
      ).join("\n");
      return { code: `${fontImports}\n${patched}`, map: null };
    },
  };
}

export default defineConfig({
  resolve: {
    alias: PDFKIT_NODE_ENTRY ? [{ find: /^pdfkit$/, replacement: PDFKIT_NODE_ENTRY }] : [],
  },
  plugins: [
    pdfkitWorkersCompat(),
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  // `start:vinext` (vite preview) — local workerd par host check.
  // Cloudflare deployment isse touch nahi hota; ye sirf local preview ke liye hai
  // taaki tunnel/remote-preview hosts (localhost, *.e2b.app, trycloudflare) kaam karein.
  preview: {
    allowedHosts: true,
  },
});
