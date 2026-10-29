#!/usr/bin/env node
/**
 * GitHub Pages static preview.
 *
 * Pages par Node server nahi chalta, isliye yahan sirf "dekhne layak" static build
 * banti hai: home, collections, product pages, cart/wishlist UI, policies.
 * Server wale hisse (API, order tracking, checkout submission) Render par chalte hain.
 *
 * Script build ke dauraan kuch files temporarily hataata hai aur build ke baad
 * hamesha wapas rakh deta hai (fail ho jaye to bhi).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const APP = path.join(ROOT, "apps/web");
const APP_DIR = path.join(APP, "src/app");
const TMP = path.join(ROOT, ".pages-preview-tmp");
const BASE_PATH = process.env.PAGES_BASE_PATH ?? "";


/**
 * Live store ki `/api/settings` — sirf public keys (number, Daily Special,
 * announcement). Kuch bhi na mile to `null` (build chalta rahega).
 */
async function readLiveSettings(base) {
  if (!base) return null;
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/settings`, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const data = payload?.data ?? payload;
    if (!data || typeof data !== "object") return null;
    return {
      whatsapp: typeof data.whatsapp === "string" ? data.whatsapp : "",
      dailySpecial: typeof data.dailySpecial === "string" ? data.dailySpecial : "",
      announcement: typeof data.announcement === "string" ? data.announcement : "",
    };
  } catch {
    return null;
  }
}

const moved = [];
function moveAway(relative) {
  const from = path.join(APP_DIR, relative);
  if (!fs.existsSync(from)) return;
  const to = path.join(TMP, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  moved.push({ from, to });
}

function restoreAll() {
  for (const { from, to } of moved.reverse()) {
    if (fs.existsSync(to)) {
      fs.mkdirSync(path.dirname(from), { recursive: true });
      fs.renameSync(to, from);
    }
  }
  moved.length = 0;
}

try {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  // server-only routes: Pages par nahi chal sakte
  moveAway("api");
  moveAway("orders");

  // search ko static client version se replace karo
  moveAway("search");
  fs.mkdirSync(path.join(APP_DIR, "search"), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "scripts/pages/preview-search.tsx"),
    path.join(APP_DIR, "search/page.tsx"),
  );

  /**
   * Order + payment page (Pages par server nahi hota, isliye client version).
   * Is page ka HTML `404.html` ban kar GitHub Pages ki jagah leta hai — url me
   * `/orders/<number>` ho to shell order live store se laa kar wahi page dikhata hai.
   */
  fs.mkdirSync(path.join(APP_DIR, "order-preview"), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "scripts/pages/preview-order.tsx"),
    path.join(APP_DIR, "order-preview/page.tsx"),
  );

  // client-side search ke liye chhota catalogue index
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "database/seeds/catalog.json"), "utf8"));
  const index = catalog.products
    .filter((product) => product.images?.length)
    .map((product) => ({
      handle: product.handle,
      title: product.title,
      price: product.price,
      image: `${product.images[0]}?width=400`,
      color: product.color ?? "",
      fabric: product.fabric ?? "",
      category: product.category ?? "",
    }));
  fs.mkdirSync(path.join(APP, "public"), { recursive: true });
  fs.writeFileSync(path.join(APP, "public/catalog-index.json"), JSON.stringify(index));

  // wishlist / compare static preview par bhi chalein — poora product (chhota shape)
  const lite = catalog.products.map((product) => ({
    handle: product.handle,
    title: product.title,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    images: product.images ?? [],
    sizes: product.sizes ?? [],
    sizePricing: product.sizePricing ?? {},
    inStock: product.inStock !== false,
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    colourName: product.colourName ?? null,
    color: product.color ?? "",
    fabric: product.fabric ?? "",
    category: product.category ?? "anarkali",
    collections: product.collections ?? [],
    description: product.description ?? "",
    // listing ka sort/colour-group dedupe client par — server jaisa hi
    featured: product.featured === true,
    colourGroup: product.colourGroup ?? null,
    colourName: product.colourName ?? null,
  }));
  fs.writeFileSync(path.join(APP, "public/catalog-lite.json"), JSON.stringify(lite));

  /**
   * R50: WhatsApp number + Daily Special ko **prerender** me hi daal do.
   *
   * Number ka source Google Sheet hi hai, par Pages par server nahi hota — isliye
   * build ke waqt live store ki `/api/settings` se wahi values padh kar
   * `NEXT_PUBLIC_*` me daal dete hain. Isse WhatsApp button pehle HTML me hi
   * maujood hota hai (JS ka intezaar nahi), aur runtime par sheet ki nayi value
   * phir bhi jeetti hai. Live store na mile to build fail nahi hota.
   */
  const liveSettings = await readLiveSettings(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
  const previewEnv = {};
  if (liveSettings?.whatsapp) previewEnv.NEXT_PUBLIC_WHATSAPP = String(liveSettings.whatsapp);
  if (liveSettings?.dailySpecial) previewEnv.NEXT_PUBLIC_DAILY_SPECIAL = String(liveSettings.dailySpecial);
  if (liveSettings?.announcement) previewEnv.NEXT_PUBLIC_ANNOUNCEMENT = String(liveSettings.announcement);
  if (Object.keys(previewEnv).length) {
    console.log(`preview settings → ${Object.keys(previewEnv).join(", ")}`);
  }

  execSync("npm run build --workspace @noor/web", {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ...previewEnv,
      PAGES_PREVIEW: "1",
      PAGES_BASE_PATH: BASE_PATH,
      NEXT_PUBLIC_PAGES_BASE_PATH: BASE_PATH,
      NEXT_PUBLIC_PREVIEW: "1",
    },
  });

  const out = path.join(APP, "out");
  const dist = path.join(ROOT, "dist");
  fs.rmSync(dist, { recursive: true, force: true });
  fs.cpSync(out, dist, { recursive: true });
  // GitHub Pages Jekyll ko bypass kare
  fs.writeFileSync(path.join(dist, ".nojekyll"), "");

  /**
   * `/orders/…` deep links chalein: order shell ka HTML `404.html` ke roop me
   * rakha jaata hai. GitHub Pages har missing path par yahi file deta hai, aur
   * shell URL se order number nikaal kar page render kar deta hai (404 ki jagah).
   */
  const orderShell = path.join(out, "order-preview", "index.html");
  if (fs.existsSync(orderShell)) {
    fs.copyFileSync(orderShell, path.join(dist, "404.html"));
    const ordersDir = path.join(dist, "orders");
    fs.mkdirSync(ordersDir, { recursive: true });
    fs.writeFileSync(
      path.join(ordersDir, "index.html"),
      fs.readFileSync(orderShell, "utf8").replace(
        "</head>",
        '<meta name="robots" content="noindex"><script>location.replace("/" + (location.pathname.split("/")[1] || "") + "/track-order/");</script></head>',
      ),
    );
    console.log("order shell → dist/404.html (deep links ke liye)");
  }
  console.log(`static preview ready: ${dist} (${BASE_PATH || "/"})`);
} finally {
  fs.rmSync(path.join(APP_DIR, "search"), { recursive: true, force: true });
  fs.rmSync(path.join(APP_DIR, "order-preview"), { recursive: true, force: true });
  restoreAll();
  fs.rmSync(path.join(APP, "public/catalog-index.json"), { force: true });
  fs.rmSync(TMP, { recursive: true, force: true });
}
