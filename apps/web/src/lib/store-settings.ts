import "server-only";

import fs from "@/lib/fs-runtime";
import { runInBackground } from "./background";
import { dataFile } from "./data-dir";
import { dbEnabled } from "./db";
import { readSheetSettings, sheetSettingsInfo, writeSheetSettings } from "./google-sheets";

/**
 * Store settings — source of truth storefront hai.
 * Admin panel API se save karta hai, website runtime par padhti hai.
 */
export type StoreSettings = {
  announcement: string;
  /**
   * "Today's Special" ribbon under the header (owner, R50). One short English
   * line; changes in the Sheet show up on the site within seconds.
   */
  dailySpecial: string;
  freeShipping: boolean;
  /** payment yahan aata hai — owner Google Sheet se badal sakta hai */
  upiId: string;
  upiName: string;
  gstin: string;
  /** GST invoice ka seller block — sirf admin panel se edit hota hai, public API me nahi jaata */
  sellerName: string;
  sellerAddress: string;
  sellerState: string;
  supportPhone: string;
  /** @deprecated site par kahin dikhta nahi (owner rule) — sirf internal record */
  supportEmail: string;
  whatsapp: string;
  /** Admin panel ka link (sirf admin/owner ke liye — public API me nahi jaata) */
  adminUrl: string;
  /**
   * R48 — YouPI PG (UPI payment gateway). Ye teen public hain (browser ko
   * `youpi.js` embed karne ke liye chahiye), sheet se live badalte hain:
   *   Settings tab → `youpi_enabled`, `youpi_pay_url`, `youpi_merchant_id`
   */
  youpiEnabled: boolean;
  youpiPayUrl: string;
  youpiMerchantId: string;
  /**
   * **Sirf server** — Secret Merchant API Key (`X-Merchant-Key`). Gateway
   * non-default merchant ka session sirf iske saath banata hai, aur isi se
   * payment status ka private view milta hai. Public API me kabhi nahi jaata.
   */
  youpiMerchantKey: string;
  /**
   * **Sirf server** — webhook HMAC secret. Ye `/api/settings` (public) aur
   * client payload me kabhi nahi jaata; sirf webhook route padhta hai.
   */
  youpiWebhookSecret: string;
  updatedAt: string;
  updatedBy: string;
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  /** R40: koi seasonal/purani copy default me nahi — owner sheet se set kare (khaali = header apni generic lines dikhata hai) */
  announcement: "",
  dailySpecial: "",
  freeShipping: true,
  /**
   * R38 (owner): purana hardcoded payee VPA code se **poora hata diya** — jo
   * sheet me hai wahi fetch honi chahiye. UPI ka ek hi source hai: Google Sheet
   * (Settings tab, `upi_id`). Env `STORE_UPI_ID` sirf emergency fallback hai
   * (sheet bilkul na chale; production me ye env bhi hata diya gaya). Dono
   * khaali hon to payment card shaant skeleton dikhata hai (customer ko koi
   * technical line nahi) aur team WhatsApp par payment link bhejti hai
   * — galat payee par paisa jaane se ye kahin behtar hai.
   */
  upiId: process.env.STORE_UPI_ID ?? "",
  upiName: process.env.STORE_UPI_NAME ?? "Noor Ethnic Wear",
  gstin: process.env.SELLER_GSTIN ?? "",
  sellerName: process.env.SELLER_NAME ?? "Noor Ethnic Wear",
  sellerAddress: process.env.SELLER_ADDRESS ?? "",
  sellerState: process.env.SELLER_STATE ?? "Rajasthan",
  supportPhone: "",
  // Owner rule: site/API par support email nahi. Internal record ke liye ab
  // sirf env (SELLER_EMAIL) — default khaali.
  supportEmail: process.env.SELLER_EMAIL ?? "",
  /**
   * R50: number ka **source sheet hi hai** (`Settings` → `whatsapp`). Env
   * `NEXT_PUBLIC_WHATSAPP` sirf tab kaam aata hai jab sheet/API bilkul
   * reachable na ho (jaise GitHub Pages static preview) — sheet ki value
   * hamesha isse jeetti hai.
   */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  adminUrl: process.env.ADMIN_PANEL_URL ?? "",
  /* R48 — gateway default se band nahi, par URL/key khaali hone par apne aap band */
  youpiEnabled: (process.env.YOUPI_ENABLED ?? "true").toLowerCase() !== "false",
  youpiPayUrl: process.env.YOUPI_PAY_URL ?? "",
  youpiMerchantId: process.env.YOUPI_MERCHANT_ID ?? "",
  youpiMerchantKey: process.env.YOUPI_MERCHANT_KEY ?? "",
  youpiWebhookSecret: process.env.YOUPI_WEBHOOK_SECRET ?? "",
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
};

let cache: { at: number; value: StoreSettings } | null = null;
/** concurrent requests ek hi merge share karein (sheet + DB dobara nahi padhe jaate) */
let inflight: { promise: Promise<StoreSettings> } | null = null;
let inflightFresh = false;
let lastBackgroundAt = 0;
/** merged settings kitni der fresh maani jaayengi (sheet ka apna TTL alag hai) */
const CACHE_TTL_MS = 5_000;

export function normalizeStoreSettings(input: unknown): StoreSettings {
  const base = DEFAULT_STORE_SETTINGS;
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<StoreSettings>;
  const text = (value: unknown, fallback: string, max = 240) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
  return {
    announcement: typeof raw.announcement === "string" ? raw.announcement.trim().slice(0, 180) : base.announcement,
    dailySpecial: typeof raw.dailySpecial === "string" ? raw.dailySpecial.trim().slice(0, 120) : base.dailySpecial,
    freeShipping: raw.freeShipping !== false,
    upiId: text(raw.upiId, base.upiId, 80),
    upiName: text(raw.upiName, base.upiName, 80),
    gstin: typeof raw.gstin === "string" ? raw.gstin.trim().toUpperCase().slice(0, 20) : base.gstin,
    sellerName: text(raw.sellerName, base.sellerName, 120),
    sellerAddress: typeof raw.sellerAddress === "string" ? raw.sellerAddress.trim().slice(0, 400) : base.sellerAddress,
    sellerState: text(raw.sellerState, base.sellerState, 60),
    supportPhone: text(raw.supportPhone, base.supportPhone, 16),
    supportEmail: text(raw.supportEmail, base.supportEmail, 120),
    whatsapp: text(raw.whatsapp, base.whatsapp, 16),
    adminUrl: text(raw.adminUrl, base.adminUrl, 200),
    youpiEnabled: typeof raw.youpiEnabled === "boolean" ? raw.youpiEnabled : base.youpiEnabled,
    youpiPayUrl: text(raw.youpiPayUrl, base.youpiPayUrl, 200),
    youpiMerchantId: text(raw.youpiMerchantId, base.youpiMerchantId, 120),
    youpiMerchantKey: text(raw.youpiMerchantKey, base.youpiMerchantKey, 200),
    youpiWebhookSecret: text(raw.youpiWebhookSecret, base.youpiWebhookSecret, 200),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : base.updatedBy,
  };
}

async function load(): Promise<StoreSettings> {
  if (dbEnabled()) {
    const { query } = await import("./db");
    const rows = await query<{ payload: StoreSettings }>(
      "select payload from store_settings where id = 'default' limit 1",
    );
    return rows[0] ? normalizeStoreSettings(rows[0].payload) : DEFAULT_STORE_SETTINGS;
  }
  const file = dataFile("settings.json");
  if (!fs.existsSync(file)) return DEFAULT_STORE_SETTINGS;
  try {
    return normalizeStoreSettings(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

/**
 * Settings = database/file ke defaults + owner ki Google Sheet (sheet jeeti hai).
 * Sheet me jo cell bhara hua hai wahi site par jaata hai, isliye owner ko redeploy
 * karne ki zaroorat nahi — sheet TTL (10s) ke andar change live.
 *
 * **stale-while-revalidate**: cache purana ho to bhi wahi value turant jaati hai aur
 * nayi value background me aa jaati hai. Page kabhi sheet ka intezaar nahi karta, aur
 * Apps Script down ho to bhi **last good** value chalti rehti hai (hardcoded default nahi).
 */
export async function getStoreSettings(options: { fresh?: boolean } = {}): Promise<StoreSettings> {
  if (!options.fresh && cache) {
    if (Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
    revalidateInBackground();
    return cache.value;
  }
  return mergeNow(options.fresh === true);
}

function mergeNow(fresh: boolean): Promise<StoreSettings> {
  // fresh request ko non-fresh in-flight promise par mat thoko
  if (inflight && (inflightFresh || !fresh)) return inflight.promise;
  const promise = merge({ fresh }).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { promise };
  inflightFresh = fresh;
  return promise;
}

/** stale value dete waqt background refresh — ek second me ek se zyada nahi. */
/**
 * Vercel par response ke baad function freeze ho sakta hai — isliye `after()`
 * (`runInBackground`), warna sheet ka fresh value background me kabhi commit hi
 * nahi hoti aur TTL khatam hone tak purani settings chalti rehti hain.
 */
function revalidateInBackground() {
  const now = Date.now();
  if (inflight || now - lastBackgroundAt < 1_000) return;
  lastBackgroundAt = now;
  runInBackground(() => merge({ fresh: false }).catch(() => undefined));
}

async function merge(options: { fresh?: boolean }): Promise<StoreSettings> {
  // DB/file padhna fail ho to pichli value chalti rahe — page 500 nahi hota
  let stored = cache?.value ?? DEFAULT_STORE_SETTINGS;
  try {
    stored = await load();
  } catch (error) {
    console.warn(`[settings] stored settings load failed: ${(error as Error).message}`);
  }

  let sheet: Awaited<ReturnType<typeof readSheetSettings>> = null;
  try {
    sheet = await readSheetSettings({ fresh: options.fresh });
  } catch (error) {
    console.warn(`[settings] sheet read failed: ${(error as Error).message}`);
  }

  const value = sheet
    ? normalizeStoreSettings({
        ...stored,
        ...(sheet.announcement ? { announcement: sheet.announcement } : {}),
        ...(sheet.dailySpecial ? { dailySpecial: sheet.dailySpecial } : {}),
        ...(sheet.supportPhone ? { supportPhone: sheet.supportPhone } : {}),
        ...(sheet.supportEmail ? { supportEmail: sheet.supportEmail } : {}),
        ...(sheet.whatsapp ? { whatsapp: sheet.whatsapp } : {}),
        ...(sheet.upiId ? { upiId: sheet.upiId } : {}),
        ...(sheet.upiName ? { upiName: sheet.upiName } : {}),
        ...(sheet.gstin ? { gstin: sheet.gstin } : {}),
        ...(typeof sheet.freeShipping === "boolean" ? { freeShipping: sheet.freeShipping } : {}),
        ...(sheet.adminUrl ? { adminUrl: sheet.adminUrl } : {}),
        /* R48 — YouPI PG live settings (URL/key sheet se, redeploy nahi) */
        ...(typeof sheet.youpiEnabled === "boolean" ? { youpiEnabled: sheet.youpiEnabled } : {}),
        ...(sheet.youpiPayUrl ? { youpiPayUrl: sheet.youpiPayUrl } : {}),
        ...(sheet.youpiMerchantId ? { youpiMerchantId: sheet.youpiMerchantId } : {}),
        ...(sheet.youpiMerchantKey ? { youpiMerchantKey: sheet.youpiMerchantKey } : {}),
        ...(sheet.youpiWebhookSecret ? { youpiWebhookSecret: sheet.youpiWebhookSecret } : {}),
        ...(sheet.announcement || sheet.upiId || sheet.supportPhone
          ? { updatedAt: new Date().toISOString(), updatedBy: "google-sheet" }
          : {}),
      })
    : stored;

  cache = { at: Date.now(), value };
  return value;
}

/**
 * Payment/tracking page ke liye settings — **time budget ke saath**.
 *
 * Order (owner rule: sheet ki value hi sach hai):
 *   1. koi bhi cache hai (fresh ya purana) → turant wahi, refresh background me.
 *      Purani **sahi** value hamesha hardcoded default se behtar hai — pehle yahi
 *      bug tha: 350ms baad payment page default UPI ID dikha deta tha.
 *   2. cache bilkul nahi (cold start) → max `budgetMs` tak asli read ka intezaar.
 *      Workers par last good value Cloudflare Cache API me rehti hai
 *      (`google-sheets.ts`), isliye ye raasta almost hamesha instant hota hai.
 *   3. tab bhi kuch na mile → defaults, aur read background me poora hota rehta hai.
 */
export async function getStoreSettingsFast(budgetMs = 3_000): Promise<StoreSettings> {
  if (cache) {
    if (Date.now() - cache.at >= CACHE_TTL_MS) revalidateInBackground();
    return cache.value;
  }
  const slow = mergeNow(false).catch(() => null);
  const timeout = new Promise<null>((resolve) => {
    const timer = setTimeout(() => resolve(null), budgetMs);
    // server process ko timer zinda na rakhe
    if (typeof timer === "object" && typeof (timer as { unref?: () => void }).unref === "function") {
      (timer as { unref: () => void }).unref();
    }
  });
  const fast = await Promise.race([slow, timeout]);
  if (fast) return fast;
  // baaki kaam background me poora ho jaaye (agle request par cache ready milega)
  void slow;
  return DEFAULT_STORE_SETTINGS;
}

/**
 * Live diagnostics — admin panel ka "Google Sheet" screen isi se batata hai ki
 * settings sheet se aa rahi hain ya defaults se, aur last read kitna purana hai.
 */
export function storeSettingsInfo() {
  const sheet = sheetSettingsInfo();
  return {
    ...sheet,
    cachedAt: cache?.at ?? null,
    cacheAgeMs: cache ? Date.now() - cache.at : null,
    updatedBy: cache?.value.updatedBy ?? null,
    upiId: cache?.value.upiId ?? null,
  };
}

export async function saveStoreSettings(input: unknown, actor: string): Promise<StoreSettings> {
  const next = normalizeStoreSettings({
    ...(input as StoreSettings),
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  });

  if (dbEnabled()) {
    const { query } = await import("./db");
    await query(
      `insert into store_settings (id, payload, updated_at) values ('default', $1::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [JSON.stringify(next)],
    );
  } else {
    const file = dataFile("settings.json");
    fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(next, null, 2));
  }

  // sheet configured hai to admin ka edit seedha sheet me bhi (owner ko wahi dikhe)
  await writeSheetSettings(next).catch(() => false);

  cache = { at: Date.now(), value: next };
  return next;
}
