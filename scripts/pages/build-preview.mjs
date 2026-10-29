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
/**
 * Base path — khaali (root) ya `/something`.
 *
 * Owner ke GitHub variable me ek baar random text (`hgvkjhftg`) aa gaya tha aur
 * Next ne `Specified basePath has to start with a /` keh kar **poora build tor
 * diya**. Ab galat value chup-chaap ignore hoti hai: site root par banti hai.
 */
const RAW_BASE_PATH = (process.env.PAGES_BASE_PATH ?? "").trim();
const BASE_PATH = /^\/[A-Za-z0-9._~\-/]*$/.test(RAW_BASE_PATH) ? RAW_BASE_PATH.replace(/\/+$/, "") : "";
if (RAW_BASE_PATH && !BASE_PATH) {
  console.warn(`⚠ PAGES_BASE_PATH='${RAW_BASE_PATH}' galat hai (start me '/' chahiye) — root par build ho raha hai`);
}


/* ═══════════════════════════ settings (R50) ═════════════════════════════════
 * Owner ki Google Sheet hi settings ka source hai — par GitHub Pages par koi
 * server nahi hota, isliye build ke waqt hi values padhni padti hain.
 *
 * Order (jo pehle mile wahi jeetta hai):
 *   1. Apps Script web app  → GOOGLE_SHEETS_WEBAPP_URL [+ GOOGLE_SHEETS_TOKEN]
 *   2. Published Settings CSV → GOOGLE_SHEETS_SETTINGS_CSV_URL
 *   3. Sheet ki `gviz` CSV   → SHEET_ID (sheet "anyone with link" ho to)
 *   4. Live store ka API     → NEXT_PUBLIC_API_BASE_URL/api/settings
 *
 * Kuch bhi na mile to build nahi rukta; bas number bake nahi hota aur runtime
 * par browser wahi (4) dobara try karta hai.
 * ══════════════════════════════════════════════════════════════════════════ */

/** CSV ek line → fields (quoted comma/quote bhi sahi) */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** Settings CSV (`key,value` rows) → flat object */
function settingsFromCsv(csv) {
  const rows = {};
  for (const line of csv.split(/\r?\n/)) {
    const fields = parseCsvLine(line);
    if (fields.length < 2) continue;
    const key = fields[0].replace(/\s+/g, " ").trim().toLowerCase().replace(/ /g, "_");
    const value = fields[1].trim();
    if (!key || key === "key" || !value) continue;
    rows[key] = value;
  }
  return rows;
}

/** Alag-alag naam → ek shape */
function normaliseSettings(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw.settings ?? raw.data ?? raw;
  if (!source || typeof source !== "object") return null;
  const pick = (...keys) => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  };
  const settings = {
    whatsapp: pick("whatsapp", "whatsapp_number", "WhatsApp"),
    supportPhone: pick("support_phone", "supportPhone", "phone"),
    dailySpecial: pick("daily_special", "dailySpecial", "special_bar"),
    announcement: pick("announcement", "Announcement"),
    upiId: pick("upi_id", "upiId", "upi"),
  };
  return Object.values(settings).some(Boolean) ? settings : null;
}

let settingsAttempt = null;

async function resolveSettings() {
  const attempts = [];
  const tried = async (label, run) => {
    try {
      const value = await run();
      attempts.push(`${label}: ${value ? "ok" : "empty"}`);
      return value ?? null;
    } catch (error) {
      attempts.push(`${label}: ${String(error?.message ?? error).slice(0, 80)}`);
      return null;
    }
  };

  const webapp = (process.env.GOOGLE_SHEETS_WEBAPP_URL ?? "").trim();
  const first = await tried("apps-script", async () => {
    if (!/^https:\/\/script\.google\.com\//.test(webapp)) return null;
    const endpoint = new URL(webapp);
    endpoint.searchParams.set("action", "settings");
    const token = (process.env.GOOGLE_SHEETS_TOKEN ?? "").trim();
    if (token) endpoint.searchParams.set("token", token);
    endpoint.searchParams.set("_ts", String(Date.now()));
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normaliseSettings(await response.json());
  });
  if (first) {
    settingsAttempt = attempts.join(" · ");
    console.log(`settings ← apps-script (${settingsAttempt})`);
    return first;
  }

  const csvUrl = (process.env.GOOGLE_SHEETS_SETTINGS_CSV_URL ?? "").trim();
  const second = await tried("published-csv", async () => {
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(csvUrl)) return null;
    const response = await fetch(csvUrl, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normaliseSettings(settingsFromCsv(await response.text()));
  });
  if (second) {
    settingsAttempt = attempts.join(" · ");
    console.log(`settings ← published-csv (${settingsAttempt})`);
    return second;
  }

  const sheetId = (process.env.SHEET_ID ?? process.env.SHEET_EXPECTED_ID ?? "").trim();
  const third = await tried("sheet-gviz", async () => {
    if (!/^[A-Za-z0-9_-]{20,}$/.test(sheetId)) return null;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Settings`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    if (!body.includes(",")) throw new Error("not a CSV (sheet is private?)");
    return normaliseSettings(settingsFromCsv(body));
  });
  if (third) {
    settingsAttempt = attempts.join(" · ");
    console.log(`settings ← sheet-gviz (${settingsAttempt})`);
    return third;
  }

  /**
   * Live store — agar STORE_API_URL set na ho (ya wo down ho) to owner ke
   * purane/possible hosts bhi try hote hain. Jo pehla jawab de, wahi settings
   * deta hai; sab fail ho to sirf log.
   */
  /**
   * Repo snapshot — owner ki Sheet ka mirror (`config/store-settings.snapshot.json`).
   * Sheet private ho aur koi secret set na ho to bhi site par asli number rehta hai.
   * Sheet/API ka jawab aane par ye file kabhi istemaal nahi hoti.
   */
  const snapshotPath = path.join(ROOT, "config/store-settings.snapshot.json");
  const fifth = await tried("repo-snapshot", async () => {
    if (!fs.existsSync(snapshotPath)) return null;
    const raw = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    return normaliseSettings(raw);
  });

  const configuredBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
  const candidates = [
    configuredBase,
    "https://noor-ethnic-wear.vercel.app",
    "https://noorethnicwear.vercel.app",
    "https://noor-ethnic-wear.netlify.app",
    "https://noorethnicwear.netlify.app",
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  let fourth = null;
  for (const base of candidates) {
    const value = await tried(
      `live-store ${new URL(base).host}`,
      async () => {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/settings`, {
          signal: AbortSignal.timeout(10_000),
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return normaliseSettings(await response.json());
      },
    );
    if (value) {
      fourth = value;
      process.env.NEXT_PUBLIC_API_BASE_URL = base;
      break;
    }
  }
  settingsAttempt = attempts.join(" · ");
  if (fourth) {
    console.log(`settings ← live-store (${settingsAttempt})`);
    return fourth;
  }
  if (fifth) {
    console.log(`settings ← repo-snapshot (${settingsAttempt})`);
    return fifth;
  }
  console.log(`settings ← kuch nahi mila (${settingsAttempt})`);
  return null;
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
  const liveSettings = await resolveSettings();
  /**
   * Sheet/API se jo mila use repo snapshot se **per-key** merge karte hain.
   * Wajah: owner ki sheet me koi naya key (jaise `daily_special`) ho aur unka
   * deployed Apps Script purana ho, to wo key response me hi nahi aati. Aise me
   * snapshot ki value chalti hai — baaki sab kuch sheet se hi aata hai.
   */
  const snapshotSettings = (() => {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "config/store-settings.snapshot.json"), "utf8"));
      return normaliseSettings(raw);
    } catch {
      return null;
    }
  })();
  const resolvedSettings = (() => {
    if (!liveSettings && !snapshotSettings) return null;
    const merged = { ...(snapshotSettings ?? {}) };
    for (const [key, value] of Object.entries(liveSettings ?? {})) {
      if (typeof value === "string" && value.trim()) merged[key] = value.trim();
    }
    return merged;
  })();
  /**
   * Sheet ki value hi jeetti hai. Sheet na padh paaye (private sheet / store down)
   * to repo variable se diya hua fallback chalta hai — `vars.STORE_WHATSAPP` /
   * `secrets.STORE_WHATSAPP` (pages.yml se env me aata hai), aur last me
   * browser runtime par API se number maangta hai.
   */
  const previewEnv = {};
  const fallbackWhatsapp = (process.env.NEXT_PUBLIC_WHATSAPP ?? "").trim();
  const fallbackDaily = (process.env.NEXT_PUBLIC_DAILY_SPECIAL ?? "").trim();
  const fallbackAnnounce = (process.env.NEXT_PUBLIC_ANNOUNCEMENT ?? "").trim();
  if (resolvedSettings?.whatsapp) previewEnv.NEXT_PUBLIC_WHATSAPP = String(resolvedSettings.whatsapp);
  else if (fallbackWhatsapp) previewEnv.NEXT_PUBLIC_WHATSAPP = fallbackWhatsapp;
  if (resolvedSettings?.supportPhone) previewEnv.NEXT_PUBLIC_SUPPORT_PHONE = String(resolvedSettings.supportPhone);
  if (resolvedSettings?.dailySpecial) previewEnv.NEXT_PUBLIC_DAILY_SPECIAL = String(resolvedSettings.dailySpecial);
  else if (fallbackDaily) previewEnv.NEXT_PUBLIC_DAILY_SPECIAL = fallbackDaily;
  if (resolvedSettings?.announcement) previewEnv.NEXT_PUBLIC_ANNOUNCEMENT = String(resolvedSettings.announcement);
  else if (fallbackAnnounce) previewEnv.NEXT_PUBLIC_ANNOUNCEMENT = fallbackAnnounce;
  if (Object.keys(previewEnv).length) {
    console.log(`preview settings → ${Object.keys(previewEnv).join(", ")}`);
  } else {
    console.log("preview settings → koi setting nahi mili (number runtime par API se aayega)");
  }
  /**
   * R50b: browser order seedha Apps Script par jaata hai (Sheet me row banti
   * hai). Is URL ka hona zaroori hai — proof file me flag rakhte hain taaki live
   * check bata sake.
   */
  const sheetOrderUrl = (
    process.env.NEXT_PUBLIC_SHEETS_WEBAPP_URL ??
    process.env.GOOGLE_SHEETS_WEBAPP_URL ??
    ""
  ).trim();
  if (sheetOrderUrl) previewEnv.NEXT_PUBLIC_SHEETS_WEBAPP_URL = sheetOrderUrl;

  const settingsProof = {
    at: new Date().toISOString(),
    attempt: settingsAttempt,
    sheetOrderUrlSet: /^https:\/\/script\.google\.com\//.test(sheetOrderUrl),
    whatsappSet: Boolean(resolvedSettings?.whatsapp),
    numberDigits: (resolvedSettings?.whatsapp ?? "").replace(/\D/g, "").length,
    dailySpecialSet: Boolean(resolvedSettings?.dailySpecial),
    announcementSet: Boolean(resolvedSettings?.announcement),
  };
  try {
    fs.writeFileSync(path.join(ROOT, ".pages-preview-settings.json"), JSON.stringify(settingsProof, null, 2));
  } catch (ignored) {}

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
   * R50 diagnostics: build ne settings kis source se li, ye site par hi ek chhoti
   * JSON file me — live check isi ko padh kar bata deta hai ki number bake hua
   * tha ya nahi (number khud is file me nahi jaata).
   */
  fs.writeFileSync(path.join(dist, "preview-settings.json"), JSON.stringify(settingsProof, null, 2));

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
        '<meta name="robots" content="noindex"><script>location.replace("' + BASE_PATH + '/track-order/");</script></head>',
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
