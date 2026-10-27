import "server-only";

import type { Order } from "@noor/types";
import { runInBackground } from "./background";
import {
  invoiceSheetRow,
  normaliseSheetSettings,
  orderItemSheetRows,
  orderSheetRow,
  parseSettingsCsv,
  shipmentSheetRow,
  type SheetSettings,
} from "./sheet-format";

export { normaliseSheetSettings, orderItemSheetRows, orderSheetRow, parseSettingsCsv, shipmentSheetRow, invoiceSheetRow };
export type { SheetSettings };

/**
 * Google Sheets bridge (owner ki sheet = settings ka source of truth).
 *
 * Do kaam:
 *   1. READ  — owner ki "Settings" sheet se phone, email, UPI ID, announcement,
 *              GSTIN, free shipping — website runtime par padhti hai (10s TTL +
 *              stale-while-revalidate, `no-store` fetch, 4s timeout), isliye sheet
 *              me value badalte hi site par badal jaati hai — redeploy ki zaroorat nahi.
 *   2. WRITE — har order / payment / message / subscriber ek row ban ke owner ki
 *              "Orders" / "Payments" / "Messages" sheet me chala jaata hai. Append-only
 *              log hai, isliye owner ko poora history + latest status dono dikhte hain.
 *
 * Setup: Google Sheet → Extensions → Apps Script → `scripts/google-apps-script/noor-sheets.gs`
 * deploy → Web app URL + token env me. Poora guide: docs/09-devops/google-sheets.md
 *
 * Sheets optional hai: configure nahi hai to site Postgres/JSON par chalti hai
 * (koi feature band nahi hota) — sirf owner edits sheet se nahi honge.
 */

export type SheetName =
  | "Orders"
  | "OrderItems"
  | "Payments"
  | "Invoices"
  | "Shipments"
  | "Messages"
  | "Newsletter"
  | "Checkout"
  | "Reviews"
  | "Coupons"
  | "Inventory"
  | "Audit"
  | "Errors";

export type SheetAppend = {
  sheet: SheetName;
  row: Record<string, string | number | boolean | null | undefined>;
};

function envNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : fallback;
}

/**
 * Apps Script read timeout — **4 second** (pehle 900ms tha).
 *
 * Asli wajah (26 Oct 2026): Apps Script ka `doGet` cold start par 1–4 second leta
 * hai. 900ms par read **hamesha** timeout hota tha, `readSheetSettings()` `null`
 * deta tha, aur site chup-chaap default UPI ID par chali jaati thi — owner sheet me
 * value badalta tha, site par kuch nahi hota tha. Timeout env se tunable hai.
 */
const READ_TIMEOUT_MS = envNumber("SHEET_READ_TIMEOUT_MS", 4_000);
const WRITE_TIMEOUT_MS = 6_000;
/**
 * Settings kitni der "fresh" maani jaayengi (owner ka sheet edit itni der me live).
 * Page load ko kabhi block nahi karti — stale value turant jaati hai aur refresh
 * background me hota hai (stale-while-revalidate).
 */
/* R37 (owner): "instant means instant" — 10s → 2s. SWR + `?fresh=1` bhi hai. */
const SETTINGS_TTL_MS = envNumber("SHEET_SETTINGS_TTL_MS", 2_000);
/** Apps Script/CSV down ho tab bhi **last good** value itni der tak chalegi (defaults par nahi jaayenge). */
const STALE_MAX_MS = envNumber("SHEET_SETTINGS_STALE_MS", 10 * 60_000);

/**
 * Google Apps Script ko browser jaisi request chahiye.
 *
 * Kyun (25 Oct 2026): bina `User-Agent` bheje Google datacenter IP (Vercel) ko
 * bot samajh kar `window['ppConfig']` wala JS challenge page lauta deta hai —
 * request script tak pahunchti hi nahi, aur owner ko "permission / HTML" problem
 * dikhti hai. Isliye har call me normal browser UA + accept headers jaate hain.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const SHEET_REQUEST_HEADERS: Record<string, string> = {
  "user-agent": BROWSER_UA,
  accept: "application/json",
  "accept-language": "en-IN,en;q=0.9",
};

function sheetHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { ...SHEET_REQUEST_HEADERS, ...extra };
}

export function googleSheetsConfig(): { url: string; token: string } | null {
  const url = (process.env.GOOGLE_SHEETS_WEBAPP_URL ?? "").trim();
  if (!url) return null;
  // Apps Script URL hi hona chahiye — warna token kisi unknown host par na jaye
  if (!/^https:\/\/script\.google\.com\//.test(url)) return null;
  return { url, token: (process.env.GOOGLE_SHEETS_TOKEN ?? "").trim() };
}

export function sheetsConfigured(): boolean {
  return Boolean(googleSheetsConfig());
}

/**
 * R38/R39: sheet-id verify — constant owner ki final sheet (27 Oct) ka hai.
 * Owner sheet badle to `?action=adopt` se script apni SHEET_ID property update
 * karta hai aur site ki expected id `SHEET_EXPECTED_ID` env se override ho
 * sakti hai (code redeploy ki zaroorat nahi); asli id `/api/sheet-health` par.
 */
export function expectedSheetId(): string {
  return (process.env.SHEET_EXPECTED_ID ?? "").trim() || EXPECTED_SHEET_ID;
}

/** Error strings token ko logs/API tak na le jaayein (token query me bhi jaata hai). */
export function redactSheetSecrets(message: string): string {
  const token = googleSheetsConfig()?.token;
  if (!token) return message;
  return message.split(token).join("[token]");
}

/**
 * Owner ki **published** Settings CSV (File → Share → Publish to web).
 *
 * Kyun: Apps Script ke bina bhi settings (phone, UPI ID, announcement) sheet se
 * padhi ja sakti hain — published CSV read-only hoti hai par padhne ke liye kaafi
 * hai. Isse "sheet me value badli, site par nahi aayi" wala gap band hota hai
 * jab tak naya Apps Script deployment set nahi hota.
 */
export function settingsCsvUrl(): string | null {
  const url = (process.env.GOOGLE_SHEETS_SETTINGS_CSV_URL ?? "").trim();
  if (!url) return null;
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(url)) return null;
  return url;
}


type SheetSettingsSource = "apps-script" | "csv" | null;

type SheetSettingsCache = {
  /** last good value — read fail hone par bhi yahi zinda rehta hai */
  value: SheetSettings | null;
  /** last successful read (epoch ms) */
  at: number;
  /** last failed read (epoch ms, 0 = kabhi fail nahi hua) */
  failedAt: number;
  /** last read ki latency (diagnostics) */
  ms: number;
  source: SheetSettingsSource;
  error: string | null;
};

let cache: SheetSettingsCache | null = null;
/** concurrent requests ek hi network read share karein (Apps Script quota bachta hai) */
let inflight: Promise<SheetSettings | null> | null = null;
let lastBackgroundAt = 0;

export type SheetSettingsInfo = {
  configured: boolean;
  source: SheetSettingsSource;
  /** last good read kitni purani hai (null = kabhi nahi padhi gayi) */
  ageMs: number | null;
  stale: boolean;
  lastReadMs: number;
  lastError: string | null;
  ttlMs: number;
  readTimeoutMs: number;
};

/** Admin panel / self-test ke liye: sheet settings abhi kahan se aa rahi hain. */
export function sheetSettingsInfo(): SheetSettingsInfo {
  const now = Date.now();
  const ageMs = cache?.value ? now - cache.at : null;
  return {
    configured: Boolean(googleSheetsConfig()) || Boolean(settingsCsvUrl()),
    source: cache?.value ? cache.source : null,
    ageMs,
    stale: ageMs === null ? true : ageMs >= SETTINGS_TTL_MS,
    lastReadMs: cache?.ms ?? 0,
    lastError: cache?.error ?? null,
    ttlMs: SETTINGS_TTL_MS,
    readTimeoutMs: READ_TIMEOUT_MS,
  };
}

/* ───────────────────────── edge cache (Cloudflare Workers) ───────────────────────── */

/**
 * Workers par module-level cache **isolate** ke saath marta hai — har cold start par
 * site hardcoded defaults par chali jaati thi (payment page par purana UPI ID).
 * Isliye last good value Cloudflare ke Cache API me bhi rakhte hain: naya isolate
 * use 1–5ms me padh leta hai aur sheet ka intezaar kiye bina sahi UPI dikha deta hai.
 * Node (Vercel/Render) par `caches` hota hi nahi — wahan ye poora block no-op hai.
 */
const EDGE_CACHE_KEY = "https://sheet-settings.noor.internal/store-settings.json";

function edgeCache(): Cache | null {
  try {
    const api = (globalThis as unknown as { caches?: { default?: Cache } }).caches;
    return api && typeof api.default?.match === "function" ? api.default : null;
  } catch {
    return null;
  }
}

async function edgeRead(): Promise<SheetSettingsCache | null> {
  const store = edgeCache();
  if (!store) return null;
  try {
    const response = await store.match(EDGE_CACHE_KEY, { ignoreMethod: true });
    if (!response) return null;
    const payload = (await response.json()) as { value?: SheetSettings; at?: number; source?: SheetSettingsSource };
    const value = normaliseSheetSettings(payload?.value);
    if (!value || typeof payload?.at !== "number") return null;
    if (Date.now() - payload.at > STALE_MAX_MS) return null;
    return { value, at: payload.at, failedAt: 0, ms: 0, source: payload.source ?? "apps-script", error: null };
  } catch {
    return null;
  }
}

function edgeWrite(value: SheetSettings, source: SheetSettingsSource) {
  const store = edgeCache();
  if (!store) return;
  void (async () => {
    try {
      await store.put(
        EDGE_CACHE_KEY,
        new Response(JSON.stringify({ value, at: Date.now(), source }), {
          headers: {
            "content-type": "application/json",
            "cache-control": `public, s-maxage=${Math.round(STALE_MAX_MS / 1000)}`,
          },
        }),
      );
    } catch {
      /* local workerd / dev par Cache API likhne nahi deti — ignore */
    }
  })();
}

function edgeDelete() {
  const store = edgeCache();
  if (!store) return;
  try {
    void store.delete(EDGE_CACHE_KEY, { ignoreMethod: true }).catch(() => undefined);
  } catch {
    /* Cache API available nahi — memory cache hi kaafi hai */
  }
}

/** Admin ne settings save ki / owner ne "abhi refresh karo" dabaya → cache poora hatao. */
export function invalidateSheetSettings() {
  cache = null;
  edgeDelete();
}

/**
 * Owner ki Settings sheet padho. Fail ho to **last good** value (site defaults par
 * nahi jaati); kuch bhi configured nahi to `null`.
 *
 * Real-time contract:
 *   • value TTL (10s) ke andar hai → turant wapas (koi network nahi)
 *   • value purani hai → purani turant jaati hai + refresh **background** me
 *   • `fresh: true` → hamesha network (payment page / admin / self-test)
 */
export async function readSheetSettings(options: { fresh?: boolean } = {}): Promise<SheetSettings | null> {
  // cold isolate (Workers) — pehle edge cache se last good value utha lo
  if (!cache) cache = await edgeRead();
  const now = Date.now();

  if (!options.fresh && cache) {
    if (cache.value && now - cache.at < SETTINGS_TTL_MS) return cache.value;
    // haal hi me fail hua hai → TTL tak dobara network nahi (warna har page 4s atkega)
    if (cache.failedAt && now - cache.failedAt < SETTINGS_TTL_MS) return cache.value;
    if (cache.value && now - cache.at < STALE_MAX_MS) {
      revalidateInBackground();
      return cache.value;
    }
  }

  if (!googleSheetsConfig() && !settingsCsvUrl()) return null;
  return readNow();
}

/**
 * stale-while-revalidate: page ruke bina background me nayi value laao.
 *
 * `runInBackground` (Next `after()`) isliye zaroori hai: **Vercel** par response
 * jaate hi function freeze ho sakta hai, aur `void promise` wala refresh kabhi
 * poora hi nahi hota — sheet ka naya UPI agle request tak purana rehta. Workers
 * par `after()` fallback fire-and-forget hi chalta hai (pehle jaisa).
 */
function revalidateInBackground() {
  const now = Date.now();
  if (inflight || now - lastBackgroundAt < 1_000) return;
  lastBackgroundAt = now;
  runInBackground(() => readNow().catch(() => undefined));
}

/** Ek hi network read — concurrent callers wahi promise share karte hain. */
function readNow(): Promise<SheetSettings | null> {
  if (inflight) return inflight;
  const run = fetchSheetSettings().finally(() => {
    inflight = null;
  });
  inflight = run;
  return run;
}

function commit(value: SheetSettings, source: SheetSettingsSource, startedAt: number): SheetSettings {
  cache = { value, at: Date.now(), failedAt: 0, ms: Date.now() - startedAt, source, error: null };
  edgeWrite(value, source);
  return value;
}

/** Read fail — par last good value **rakhte hain** (pehle use null kar dete the). */
function failRead(message: string, startedAt: number): SheetSettings | null {
  const previous = cache?.value ?? null;
  cache = {
    value: previous,
    at: previous ? cache?.at ?? 0 : 0,
    failedAt: Date.now(),
    ms: Date.now() - startedAt,
    source: previous ? cache?.source ?? null : null,
    error: message,
  };
  return previous;
}

async function fetchSheetSettings(): Promise<SheetSettings | null> {
  const startedAt = Date.now();
  const config = googleSheetsConfig();

  if (config) {
    try {
      const endpoint = new URL(config.url);
      endpoint.searchParams.set("action", "settings");
      if (config.token) endpoint.searchParams.set("token", config.token);
      // cache-buster — beech ka koi bhi proxy/CDN purani value na de
      endpoint.searchParams.set("_ts", String(startedAt));
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: sheetHeaders(),
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = normaliseSheetSettings(await response.json());
      if (!value) throw new Error("response me koi setting value nahi");
      return commit(value, "apps-script", startedAt);
    } catch (error) {
      const message = (error as Error).message;
      console.warn(`[sheets] settings read failed (${Date.now() - startedAt}ms): ${message}`);
      // Apps Script down/galat ho to bhi owner ki published CSV se padh lo
      const csv = await readSettingsFromCsv().catch((csvError: Error) => {
        console.warn(`[sheets] settings CSV read failed: ${csvError.message}`);
        return null;
      });
      if (csv) return commit(csv, "csv", startedAt);
      return failRead(message, startedAt);
    }
  }

  try {
    const csv = await readSettingsFromCsv();
    if (csv) return commit(csv, "csv", startedAt);
    return failRead("CSV me koi setting nahi mili", startedAt);
  } catch (error) {
    return failRead((error as Error).message, startedAt);
  }
}

/**
 * Public CSV se settings (Apps Script set na ho to bhi sheet padhi jaati hai).
 *
 * Note: "Publish to web" CSV ko Google ~5 minute cache karta hai — isliye ye sirf
 * **fallback** hai. Real-time chahiye to Apps Script wala `/exec` URL hi bharein.
 */
async function readSettingsFromCsv(): Promise<SheetSettings | null> {
  const url = settingsCsvUrl();
  if (!url) return null;
  const response = await fetch(url, {
    cache: "no-store",
    headers: sheetHeaders({ accept: "text/csv" }),
    signal: AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = parseSettingsCsv(await response.text());
  if (!value) throw new Error("CSV me koi setting nahi mili");
  return value;
}

/** Admin settings → Google Sheet (owner ki sheet hamesha latest rahe). */
export async function writeSheetSettings(settings: {
  announcement?: string;
  supportPhone?: string;
  supportEmail?: string;
  whatsapp?: string;
  upiId?: string;
  upiName?: string;
  gstin?: string;
  freeShipping?: boolean;
  adminUrl?: string;
  youpiEnabled?: boolean;
  youpiPayUrl?: string;
  youpiMerchantId?: string;
  youpiMerchantKey?: string;
  youpiWebhookSecret?: string;
}): Promise<boolean> {
  const config = googleSheetsConfig();
  if (!config) return false;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      cache: "no-store",
      headers: sheetHeaders({ "content-type": "text/plain;charset=utf-8" }),
      body: JSON.stringify({
        token: config.token,
        action: "settings_save",
        settings: {
          announcement: settings.announcement ?? "",
          support_phone: settings.supportPhone ?? "",
          support_email: settings.supportEmail ?? "",
          whatsapp: settings.whatsapp ?? "",
          upi_id: settings.upiId ?? "",
          upi_name: settings.upiName ?? "",
          gstin: settings.gstin ?? "",
          free_shipping: settings.freeShipping !== false,
          ...(settings.adminUrl ? { admin_url: settings.adminUrl } : {}),
          /* R48 — YouPI PG: sirf bhari hui values likhi jaati hain (khaali se sheet ki value na mite) */
          ...(typeof settings.youpiEnabled === "boolean" ? { youpi_enabled: settings.youpiEnabled } : {}),
          ...(settings.youpiPayUrl ? { youpi_pay_url: settings.youpiPayUrl } : {}),
          ...(settings.youpiMerchantId ? { youpi_merchant_id: settings.youpiMerchantId } : {}),
          ...(settings.youpiMerchantKey ? { youpi_merchant_key: settings.youpiMerchantKey } : {}),
          ...(settings.youpiWebhookSecret ? { youpi_webhook_secret: settings.youpiWebhookSecret } : {}),
        },
      }),
      signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // Apps Script galti par bhi HTTP 200 deta hai — body check karna zaroori hai
    const body = await response.json().catch(() => null);
    if (body && body.ok === false) {
      console.warn(`[sheets] settings write rejected: ${String(body.error ?? "unknown")}`);
      return false;
    }
    invalidateSheetSettings();
    return true;
  } catch (error) {
    console.warn(`[sheets] settings write failed: ${(error as Error).message}`);
    return false;
  }
}

export type SheetRecentRow = Record<string, string | number>;

/** Sheet ki last N rows (admin panel me dikhane ke liye). */
export async function readSheetRecent(
  sheet: "Orders" | "Payments" | "Messages" | "Newsletter" | "Checkout",
  limit = 20,
): Promise<SheetRecentRow[] | null> {
  const config = googleSheetsConfig();
  if (!config) return null;
  try {
    const endpoint = new URL(config.url);
    endpoint.searchParams.set("action", "recent");
    endpoint.searchParams.set("sheet", sheet);
    endpoint.searchParams.set("limit", String(Math.min(100, Math.max(1, limit))));
    if (config.token) endpoint.searchParams.set("token", config.token);
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: sheetHeaders(),
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as { ok?: boolean; rows?: SheetRecentRow[] };
    if (!payload?.ok || !Array.isArray(payload.rows)) return null;
    return payload.rows;
  } catch (error) {
    console.warn(`[sheets] recent read failed: ${(error as Error).message}`);
    return null;
  }
}

export type SheetWriteInfo = {
  at: number;
  ok: boolean;
  sheets: string;
  error: string | null;
};

let lastWrite: SheetWriteInfo | null = null;

/** /api/sheet-health + admin ke liye: sheet par last write ka nateeja. */
export function sheetWriteInfo(): SheetWriteInfo | null {
  return lastWrite;
}

/** Ek append attempt — `{ok, error}` (error redacted nahi; wrapper redact karta hai). */
async function appendSheetRowsOnce(
  config: { url: string; token: string },
  appends: SheetAppend[],
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch(config.url, {
      method: "POST",
      cache: "no-store",
      // Apps Script preflight (OPTIONS) handle nahi karta — isliye simple request
      // `text/plain` bhejte hain, script body ko JSON.parse karti hai. CORS error nahi aata.
      headers: sheetHeaders({ "content-type": "text/plain;charset=utf-8" }),
      body: JSON.stringify({ token: config.token, action: "append", rows: appends }),
      signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    /**
     * Apps Script kabhi HTTP 200 ke saath bhi `{ok:false, error}` bhejta hai
     * (galat token, sheet access, ya script me ReferenceError). Pehle hum use
     * success maan lete the — isliye "row nahi aayi" ka pata hi nahi chalta tha.
     */
    const text = await response.text();
    type AppendReply = { ok?: boolean; written?: number; error?: string; fix?: string };
    let payload: AppendReply | null = null;
    try {
      payload = JSON.parse(text) as AppendReply;
    } catch {
      payload = null;
    }
    if (!payload) {
      /**
       * JSON hi nahi aaya = script ne jawab nahi diya (Google ka HTML error page,
       * ya galat/purana webapp URL). Iska matlab hi "mirror fail" hai.
       */
      return {
        ok: false,
        error: "non-JSON reply — script ka sahi version deploy hua? URL /exec par khatam hota hai?",
      };
    }
    if (payload.ok === false) {
      return { ok: false, error: `${payload.error ?? "unknown error"}${payload.fix ? ` (fix: ${payload.fix})` : ""}` };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Sheet me rows append karo. Best-effort — order kabhi isliye fail nahi hota.
 *
 * R38: ek **retry** (600ms baad) — Apps Script cold start / transient network se
 * mirror chhoot na jaaye. Har attempt ka nateeja `sheetWriteInfo()` me dikhta hai
 * (`/api/sheet-health` isi se batata hai ki orders sheet me ja rahe hain ya nahi).
 */
export async function appendSheetRows(appends: SheetAppend[]): Promise<boolean> {
  const config = googleSheetsConfig();
  if (!config || !appends.length) return false;
  const sheets = [...new Set(appends.map((a) => a.sheet))].join(",");
  let result = await appendSheetRowsOnce(config, appends);
  if (!result.ok) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    result = await appendSheetRowsOnce(config, appends);
  }
  const error = result.error ? redactSheetSecrets(result.error) : null;
  lastWrite = { at: Date.now(), ok: result.ok, sheets, error };
  if (!result.ok) console.warn(`[sheets] append failed (${sheets}): ${error}`);
  return result.ok;
}

/**
 * Asli sheet ka id (owner ne jo link diya) — sirf **verify** karne ke liye.
 *
 * Sheet ki id public information hai (owner ka link). Token/URL kabhi yahan nahi.
 */
/**
 * Expected sheet id — **sirf env** (`SHEET_EXPECTED_ID`). Code me koi id hardcoded
 * nahi, kyunki sheet owner ke account me banti hai. Khaali = koi expectation nahi
 * (health check sirf ye batata hai ki script kis sheet par chal raha hai).
 */
export const EXPECTED_SHEET_ID = "";

export type SheetHealth = {
  ok: boolean;
  spreadsheet: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  rows: Record<string, number>;
  ms: number;
  error?: string;
  /** r38-1 script ke naye fields (purane script par undefined) */
  version?: string | null;
  tokenSet?: boolean | null;
  tokenOk?: boolean | null;
  sheetFound?: boolean | null;
  idMatch?: boolean | null;
  bound?: boolean | null;
  upiSet?: boolean | null;
  problems?: string[] | null;
};

/**
 * Apps Script se poochho: "tum kaun si sheet pakde ho?".
 *
 * Kyun zaroori: 25 Oct 2026 ko script `getActiveSpreadsheet()` ki wajah se ek
 * **copy** me likh raha tha — website ke hisaab se sab theek tha, par owner ki
 * sheet khaali. Isliye admin panel ab id match karke warning dikhata hai.
 */
export async function readSheetHealth(): Promise<SheetHealth | null> {
  const config = googleSheetsConfig();
  if (!config) return null;
  const started = Date.now();
  try {
    const endpoint = new URL(config.url);
    endpoint.searchParams.set("action", "health");
    if (config.token) endpoint.searchParams.set("token", config.token);
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: sheetHeaders(),
      signal: AbortSignal.timeout(READ_TIMEOUT_MS * 2),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as {
      ok?: boolean;
      version?: string;
      spreadsheet?: string;
      spreadsheetId?: string;
      spreadsheetUrl?: string;
      sheets?: { name?: string; rows?: number }[];
      tokenSet?: boolean;
      tokenOk?: boolean;
      sheetFound?: boolean;
      idMatch?: boolean;
      bound?: boolean;
      upiSet?: boolean;
      problems?: string[];
    };
    if (!payload?.ok) throw new Error("script ne ok:false diya");
    const rows: Record<string, number> = {};
    for (const entry of payload.sheets ?? []) {
      if (entry?.name) rows[entry.name] = Number(entry.rows ?? 0);
    }
    return {
      ok: true,
      spreadsheet: payload.spreadsheet || null,
      spreadsheetId: payload.spreadsheetId || null,
      spreadsheetUrl: payload.spreadsheetUrl || null,
      rows,
      ms: Date.now() - started,
      version: payload.version ?? null,
      tokenSet: payload.tokenSet ?? null,
      tokenOk: payload.tokenOk ?? null,
      sheetFound: payload.sheetFound ?? null,
      idMatch: payload.idMatch ?? null,
      bound: payload.bound ?? null,
      upiSet: payload.upiSet ?? null,
      problems: Array.isArray(payload.problems) ? payload.problems : null,
    };
  } catch (error) {
    return { ok: false, spreadsheet: null, spreadsheetId: null, spreadsheetUrl: null, rows: {}, ms: Date.now() - started, error: redactSheetSecrets((error as Error).message) };
  }
}

/**
 * Fire-and-forget sync — caller `await` kare to bhi 6s max.
 *
 * `order.placed` par OrderItems tab bhi bharti hai (har item alag row) — isliye
 * owner ko size/colour wise bikri ek nazar me dikhti hai. Baaki events sirf
 * timeline row likhte hain (warna items 10 baar duplicate ho jaati).
 */
export async function syncOrderToSheet(
  order: Order,
  event: string,
  extra: Record<string, string | number | null> = {},
): Promise<boolean> {
  const appends: SheetAppend[] = [
    { sheet: event.startsWith("payment") ? "Payments" : "Orders", row: orderSheetRow(order, event, extra) },
  ];
  if (event === "order.placed" || event === "order.created") {
    orderItemSheetRows(order).forEach((row) => appends.push({ sheet: "OrderItems", row }));
  }
  return appendSheetRows(appends);
}

/** Tracking/courier update — Shipments tab me alag row (owner ko dispatch list) */
export async function syncShipmentToSheet(order: Order, status = "updated"): Promise<boolean> {
  return appendSheetRows([{ sheet: "Shipments", row: shipmentSheetRow(order, status) }]);
}

/** GST invoice banne par Invoices tab me row */
export async function syncInvoiceToSheet(
  invoice: Parameters<typeof invoiceSheetRow>[0],
  order: Order,
  type = "gst",
): Promise<boolean> {
  return appendSheetRows([{ sheet: "Invoices", row: invoiceSheetRow(invoice, order, type) }]);
}
