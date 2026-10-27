#!/usr/bin/env node
/**
 * Reviews sync — noorethnicwear.in ka Trustoo reviews widget.
 *
 * Reviews client-side JS se load hote hain, isliye sandbox se direct nahi milte.
 * GitHub Actions (roz 02:30 IST) me ye script chalta hai:
 *   1. storefront se Trustoo app-proxy endpoint dhundhta hai,
 *   2. `/apps/trustoo/api/v1/reviews/get_product_list` se review-wale products,
 *   3. har product ke reviews,
 *   4. Shopify product_id → hamare handle (live snapshot se) map karke
 *      `database/seeds/reviews/reviews.json` likhta hai.
 *
 * Kuch na mile to purani file waisi hi rehti hai (koi dummy review nahi).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, "database/seeds/reviews/reviews.json");
const LIVE = path.join(ROOT, "database/seeds/live/products.json");
const STORE = "https://noorethnicwear.in";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Trustoo ka known asset base — storefront block ho jaye to yahan se endpoints milte hain */
const KNOWN_BUNDLES = [
  "https://cdn.shopify.com/extensions/01a15e0a-e410-7740-a068-d265bda59b79/cwilltrustoo-reviews-292/assets/swiper-reviews.min.js",
  "https://cdn.shopify.com/extensions/01a15e0a-e410-7740-a068-d265bda59b79/cwilltrustoo-reviews-292/assets/trustoo-sign.min.js",
  "https://cdn.shopify.com/extensions/01a15e0a-e410-7740-a068-d265bda59b79/cwilltrustoo-reviews-292/assets/seal-review.min.js",
];

const diagnostics = { steps: [], probes: [], at: new Date().toISOString() };
const note = (step, detail) => diagnostics.steps.push(`${step}: ${detail}`);

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json,text/html" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function fetchJson(url) {
  const body = await fetchText(url);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`not json (${body.slice(0, 40)})`);
  }
}

/** Shopify handles me emoji bhi hote hain — catalogue ASCII slug use karta hai */
function asciiHandle(handle) {
  return String(handle)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/**
 * product image → catalogue handle.
 * Trustoo ke product_list me har product ki ek image aati hai, aur wahi image
 * hamare catalogue me hoti hai. Live snapshot (288 products) purana ho jaye to
 * bhi is mapping se saare review-wale products mil jaate hain.
 */
function imageMap() {
  const byImage = new Map();
  const clean = (src) => String(src).split("?")[0].replace(/\/+$/, "").toLowerCase();
  for (const file of ["database/seeds/catalog.json", "apps/web/src/data/catalog.json"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    try {
      const catalog = JSON.parse(fs.readFileSync(full, "utf8"));
      for (const product of catalog.products ?? []) {
        for (const image of product.images ?? []) {
          if (!byImage.has(clean(image))) byImage.set(clean(image), product.handle);
        }
      }
    } catch {
      /* ignore */
    }
    if (byImage.size) break;
  }
  return { byImage, clean };
}

/** title/marketing naam → catalogue handle (jo products live snapshot me nahi hain unke liye) */
function titleMap() {
  const byTitle = new Map();
  for (const file of ["database/seeds/catalog.json", "apps/web/src/data/catalog.json"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    try {
      const catalog = JSON.parse(fs.readFileSync(full, "utf8"));
      for (const product of catalog.products ?? []) {
        if (!product.title || !product.handle) continue;
        byTitle.set(String(product.title).trim().toLowerCase(), product.handle);
        byTitle.set(asciiHandle(product.title), product.handle);
      }
    } catch {
      /* ignore */
    }
    if (byTitle.size) break;
  }
  return byTitle;
}

/** product_id → hamare catalogue ka handle (catalogue `sourceHandle` se slug banata hai) */
function handleMap() {
  const catalogueHandles = new Map();
  for (const file of ["apps/web/src/data/catalog.json", "database/seeds/catalog.json"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    try {
      const catalog = JSON.parse(fs.readFileSync(full, "utf8"));
      for (const product of catalog.products ?? []) {
        if (product.sourceHandle && product.handle) catalogueHandles.set(product.sourceHandle, product.handle);
      }
    } catch {
      /* ignore */
    }
    if (catalogueHandles.size) break;
  }
  const map = new Map();
  if (!fs.existsSync(LIVE)) return map;
  const live = JSON.parse(fs.readFileSync(LIVE, "utf8"));
  for (const product of live.products ?? []) {
    const handle = catalogueHandles.get(product.handle) ?? asciiHandle(product.handle);
    map.set(String(product.id), handle);
  }
  return map;
}

const asList = (payload) =>
  payload?.data?.list ??
  payload?.data?.reviews ??
  payload?.data?.items ??
  payload?.data ??
  payload?.list ??
  payload?.reviews ??
  [];

function normaliseReview(raw) {
  const photos = (
    raw.resources ??
    raw.photos ??
    raw.images ??
    raw.attachments ??
    raw.review_images ??
    []
  )
    .map((photo) => {
      if (typeof photo === "string") return photo;
      return photo?.url ?? photo?.src ?? photo?.path ?? photo?.image_src ?? "";
    })
    .filter(Boolean)
    .map((src) => (src.startsWith("//") ? `https:${src}` : src));
  const date = raw.commented_at ?? raw.created_at ?? raw.date ?? raw.time ?? raw.review_date;
  return {
    id: String(raw.id ?? raw.review_id ?? raw._id ?? Math.random().toString(36).slice(2)),
    author: String(raw.author ?? raw.reviewer_name ?? raw.customer_name ?? raw.name ?? "Verified buyer").trim(),
    rating: Number(raw.star ?? raw.rating ?? raw.score ?? raw.review_rating ?? 5),
    title: raw.title || undefined,
    body: String(raw.content ?? raw.body ?? raw.review ?? raw.message ?? raw.comment ?? "").trim(),
    date: date ? String(date).slice(0, 10) : undefined,
    verified: Boolean(raw.verified_badge ?? raw.verified ?? raw.is_verified ?? false),
    photos,
    reply: raw.reply_content ? String(raw.reply_content).trim() : undefined,
  };
}

async function main() {
  let html = "";
  try {
    html = await fetchText(`${STORE}/collections/new-arrivals`);
  } catch (error) {
    note("page-blocked", error.message.slice(0, 80));
  }
  const shopId =
    html.match(/shop_id\s*=\s*"?(\d{5,})"?/)?.[1] ??
    html.match(/shopId\\?":\s*\\?"(\d{5,})/)?.[1] ??
    "73883451696";
  const proxy = `${STORE}/apps/trustoo/api/v1/reviews`;
  note("page", `${html.length} bytes, shop ${shopId}`);

  const handles = handleMap();
  const titles = titleMap();
  const images = imageMap();
  note(
    "catalog",
    `${handles.size} product ids, ${titles.size} titles, ${images.byImage.size} product images (new sync)`,
  );

  /** entry → catalogue handle (id map pehle, phir title, phir ascii title slug) */
  const resolveHandle = (entry) => {
    const productId = String(entry.product_id ?? entry.productId ?? entry.id ?? "");
    const direct = handles.get(productId);
    if (direct) return direct;
    // image match — sabse reliable (live snapshot purana ho to bhi chalta hai)
    const image = entry.image_src ?? entry.image ?? entry.imageSrc ?? "";
    if (image) {
      const byImage = images.byImage.get(images.clean(image));
      if (byImage) return byImage;
    }
    const title = String(entry.title ?? "").trim();
    if (!title) return null;
    return titles.get(title.toLowerCase()) ?? titles.get(asciiHandle(title)) ?? null;
  };

  // 1) review-wale products
  const productEntries = [];
  for (let page = 1; page <= 15; page += 1) {
    let payload;
    try {
      payload = await fetchJson(`${proxy}/get_product_list?shop_id=${shopId}&page=${page}&limit=50`);
    } catch (error) {
      diagnostics.probes.push(`product_list p${page} → ${error.message.slice(0, 60)}`);
      break;
    }
    const list = asList(payload);
    if (!list.length) {
      if (page === 1) diagnostics.probes.push(`product_list shape ${JSON.stringify(payload).slice(0, 300)}`);
      break;
    }
    productEntries.push(...list);
    const totalPages = payload?.data?.page?.total_page ?? 1;
    if (page >= totalPages) break;
  }
  note("products-with-reviews", productEntries.length);
  if (productEntries[0]) diagnostics.probes.push(`sample product ${JSON.stringify(productEntries[0]).slice(0, 700)}`);

  // 1b) bundle se saare review endpoints nikaal ke probe karo (shape samajhne ke liye)
  const endpointNames = new Set();
  const bundleUrls = [
    ...new Set([
      ...KNOWN_BUNDLES,
      ...[...html.matchAll(/https:\/\/cdn\.shopify\.com\/extensions\/[^"'\s]*trustoo[^"'\s]*\.js/g)].map((m) => m[0]),
    ]),
  ];
  for (const bundleUrl of bundleUrls) {
    try {
      const js = await fetchText(bundleUrl);
      for (const match of js.matchAll(/api\/v1\/reviews\/([a-z0-9_]+)/gi)) endpointNames.add(match[1]);
    } catch {
      /* ignore */
    }
  }
  // bundles me sirf 4 endpoints milte hain — baaki naam guess karke probe karte hain
  const PROBE_NAMES = [
    "get_product_reviews",
    "get_reviews",
    "product_reviews",
    "review_list",
    "get_review_list",
    "get_product_detail",
    "get_product",
    "get_all_reviews",
    "get_shop_reviews",
    "get_store_reviews",
    "reviews",
    "get_review",
    "get_product_review",
    "get_reviews_by_product",
  ];
  for (const name of PROBE_NAMES) endpointNames.add(name);
  const PROBE_PREFIXES = ["reviews", "review"];
  diagnostics.endpointNames = [...endpointNames];

  const sampleProductId = String(productEntries[0]?.id ?? "");
  diagnostics.probes = [];
  const probeUrls = [];
  for (const prefix of PROBE_PREFIXES) {
    for (const name of [...endpointNames].slice(0, 24)) {
      probeUrls.push(`${STORE}/apps/trustoo/api/v1/${prefix}/${name}`);
    }
  }
  for (const name of [...endpointNames].slice(0, 24)) {
    probeUrls.push(`${STORE}/apps/trustoo/api/v1/reviews/${name}`);
  }
  for (const base of probeUrls.slice(0, 40)) {
    const url = `${base}?shop_id=${shopId}&product_id=${sampleProductId}&page=1&limit=20`;
    try {
      const payload = await fetchJson(url);
      const snippet = JSON.stringify(payload).slice(0, 220);
      if (!/404|not found/i.test(snippet)) diagnostics.probes.push(`${base.replace(STORE, "")} → ${snippet}`);
    } catch (error) {
      if (!error.message.startsWith("404")) diagnostics.probes.push(`${base.replace(STORE, "")} → ${error.message.slice(0, 50)}`);
    }
  }
  note("probed-endpoints", endpointNames.size);

  // 2) har product ke reviews
  const products = {};
  const aggregatesPreview = {};
  let total = 0;
  let reviewedProducts = 0;
  let skipped = 0;
  let photoReviews = 0;
  for (const entry of productEntries) {
    const productId = String(entry.product_id ?? entry.productId ?? entry.id ?? "");
    const handle = resolveHandle(entry);
    if (!productId || !handle) {
      skipped += 1;
      continue;
    }

    let reviews = [];
    let aggregate = null;
    for (let pageNo = 1; pageNo <= 10; pageNo += 1) {
      let payload = null;
      try {
        payload = await fetchJson(
          `${proxy}/get_product_reviews?shop_id=${shopId}&product_id=${productId}&page=${pageNo}&limit=50`,
        );
      } catch {
        break;
      }
      const rawList = asList(payload);
      if (pageNo === 1) {
        const total = payload?.data?.total_rating;
        if (total) {
          aggregate = {
            rating: Math.round(Number(total.rating ?? 0) * 10) / 10,
            count: Number(total.total_reviews ?? 0),
          };
        }
        if (rawList[0] && !diagnostics.reviewKeys) diagnostics.reviewKeys = Object.keys(rawList[0]);
      }
      // photo-only review bhi rakho — customer ne photo di hai to wo dikhni chahiye
      reviews.push(...rawList.map(normaliseReview).filter((review) => review.body || review.photos?.length));
      const totalPages = Number(payload?.data?.page?.total_page ?? 1);
      if (!rawList.length || pageNo >= totalPages) break;
    }
    // Trustoo ka total_rating kabhi 0 aata hai jab shop-level API na mile —
    // tab asli reviews se average nikaal lo (koi banaya hua number nahi).
    if (aggregate?.count && !aggregate.rating && reviews.length) {
      aggregate.rating =
        Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10;
    }
    if (aggregate?.count) aggregatesPreview[handle] = aggregate;
    if (!reviews.length) continue;

    // ek hi product par duplicate reviews na aayein
    const seen = new Set();
    reviews = reviews.filter((review) => {
      const key = `${review.author}-${(review.body || review.photos?.[0] || "").slice(0, 60)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    products[handle] = {
      rating:
        Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10,
      count: reviews.length,
      reviews,
    };
    reviewedProducts += 1;
    total += reviews.length;
    photoReviews += reviews.filter((review) => review.photos?.length).length;
  }
  note("photo-reviews", photoReviews);

  const aggregates = { ...aggregatesPreview };
  fs.writeFileSync(
    path.join(ROOT, "database/seeds/reviews/aggregates.json"),
    `${JSON.stringify({ syncedAt: new Date().toISOString(), products: aggregates }, null, 1)}\n`,
  );
  note("aggregates", Object.keys(aggregates).length);

  const all = Object.values(products).flatMap((block) => block.reviews);
  fs.writeFileSync(
    path.join(ROOT, "database/seeds/reviews/last-sync.json"),
    `${JSON.stringify({ ...diagnostics, reviewedProducts, total, aggregates: Object.keys(aggregates).length }, null, 1)}\n`,
  );

  if (!total) {
    console.warn("reviews nahi mile — purani file waisi hi rahegi");
    console.log(diagnostics.probes.slice(-6));
    return;
  }

  const file = {
    meta: {
      source: "trustoo",
      shopId,
      syncedAt: new Date().toISOString(),
      note: "scripts/reviews-sync/fetch-reviews.mjs (GitHub Actions daily) is file ko likhta hai — haath se edit na karein.",
    },
    shop: {
      rating: Math.round((all.reduce((sum, review) => sum + review.rating, 0) / all.length) * 10) / 10,
      count: all.length,
    },
    products,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(file, null, 1)}\n`);
  console.log(`saved ${total} reviews across ${reviewedProducts} products`);
  console.log(`photo reviews: ${photoReviews} · products without a catalogue match: ${skipped}`);
}

try {
  await main();
} catch (error) {
  console.warn("sync failed (non-fatal):", error.message);
  try {
    const { default: fsx } = await import("node:fs");
    fsx.writeFileSync(
      `${ROOT}/database/seeds/reviews/last-sync.json`,
      `${JSON.stringify({ error: error.message, at: new Date().toISOString() }, null, 1)}\n`,
    );
  } catch {
    /* ignore */
  }
}
