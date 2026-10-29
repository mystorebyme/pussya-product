import test, { before } from "node:test";
import assert from "node:assert/strict";
import { isolate } from "../helpers/env.ts";

/**
 * R35 — "Sheet me UPI badla, site par nahi badla" ka regression suite.
 *
 * Asli wajah teen thi:
 *   1. Apps Script read timeout **900ms** tha, jabki Google ka `doGet` cold start par
 *      1–4 second leta hai → read hamesha timeout → site defaults par chali jaati thi.
 *   2. Fail hone par cache `null` ho jaata tha → last good UPI bhi gayab.
 *   3. Payment page ka `getStoreSettingsFast(350)` 350ms baad **hardcoded default**
 *      de deta tha — yaani paisa purane UPI par jaane ka risk.
 *
 * Ye suite teeno ko naapta hai (asli `fetch` stub karke). Chalane ka tarika:
 *   `npm run test:sheets`  (server-only modules ke liye `--conditions=react-server`)
 */

const SHEET_URL = "https://script.google.com/macros/s/AKfycbTEST/exec";
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-test/pub?output=csv";

type StubReply = {
  body?: unknown;
  text?: string;
  delayMs?: number;
  status?: number;
  error?: string;
};

/** har test apna handler set karta hai: URL → reply */
let handler: (url: string) => StubReply = () => ({ error: "no stub set" });
let calls: { url: string; headers: Record<string, string> }[] = [];

function installFetchStub() {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : (input as Request).url ?? input);
    const headers: Record<string, string> = {};
    new Headers(init?.headers ?? {}).forEach((value, key) => {
      headers[key] = value;
    });
    calls.push({ url, headers });
    const reply = handler(url);
    if (reply.delayMs) {
      // asli fetch ki tarah timeout signal maano — warna timeout test jhootha hoga
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, reply.delayMs);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("The operation was aborted"));
        });
      });
    }
    if (reply.error) throw new Error(reply.error);
    return new Response(reply.text ?? JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "content-type": reply.text ? "text/csv" : "application/json" },
    });
  }) as typeof fetch;
}

/** background refresh / TTL settle hone do (tests ek doosre ka in-flight read na padhein) */
const settle = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

/** poll karke intezaar — fixed sleep se test flaky nahi hota */
async function waitUntil<T>(read: () => Promise<T>, ok: (value: T) => boolean, timeoutMs = 3_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = await read();
    if (ok(value) || Date.now() - started > timeoutMs) return value;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

const settingsReply = (upiId: string, delayMs = 0): StubReply => ({
  delayMs,
  body: { ok: true, version: "r35-test", settings: { upi_id: upiId, upi_name: "Noor Ethnic Wear" } },
});

let sheets: typeof import("../../apps/web/src/lib/google-sheets.ts");
let store: typeof import("../../apps/web/src/lib/store-settings.ts");

before(async () => {
  // TTL chhota (80ms) taaki stale-while-revalidate test seconds me ho jaaye
  isolate("sheet-settings", {
    GOOGLE_SHEETS_WEBAPP_URL: SHEET_URL,
    GOOGLE_SHEETS_TOKEN: "test-token",
    SHEET_SETTINGS_TTL_MS: "80",
    DATA_DIR: process.env.DATA_DIR ?? "/tmp/noor-sheet-settings",
  });
  installFetchStub();
  sheets = await import("../../apps/web/src/lib/google-sheets.ts");
  store = await import("../../apps/web/src/lib/store-settings.ts");
});

/* ─────────────── 1. payment page (cold start) — sabse bada bug ─────────────── */

test("payment page cold start par sheet ka UPI deta hai, hardcoded default nahi", async () => {
  // Apps Script 1.2s leta hai — pehle 350ms budget tha, isliye default UPI dikhta tha
  handler = () => settingsReply("owner-new@ybl", 1_200);
  calls = [];

  const settings = await store.getStoreSettingsFast();

  assert.equal(settings.upiId, "owner-new@ybl", "sheet ka UPI payment page tak pahuncha");
  assert.notEqual(settings.upiId, store.DEFAULT_STORE_SETTINGS.upiId, "default par fallback nahi hua");
  assert.equal(calls.length, 1, "ek hi sheet read hua");
});

test("sheet read fail ho to bhi site default UPI par nahi jaati (last good jeetta hai)", async () => {
  handler = () => ({ error: "boom — Apps Script down" });

  // fresh read: network fail, par pichhli sahi value merged settings me rehni chahiye
  const settings = await store.getStoreSettings({ fresh: true });

  assert.equal(settings.upiId, "owner-new@ybl", "last good UPI zinda raha");
  assert.notEqual(settings.upiId, store.DEFAULT_STORE_SETTINGS.upiId, "hardcoded default nahi dikha");
});

/* ─────────────────────── 2. sheet read layer (google-sheets) ─────────────────────── */

test("Apps Script 1.5s le to bhi settings padhi jaati hain (900ms timeout wala bug)", async () => {
  sheets.invalidateSheetSettings();
  handler = () => settingsReply("slow-but-live@ybl", 1_500);

  const value = await sheets.readSheetSettings({ fresh: true });

  assert.equal(value?.upiId, "slow-but-live@ybl");
  const info = sheets.sheetSettingsInfo();
  assert.equal(info.source, "apps-script");
  assert.equal(info.lastError, null);
  assert.equal(info.readTimeoutMs, 4_000, "default read timeout 4s (pehle 900ms tha)");
});

test("request me cache-buster, browser user-agent aur token jaata hai", async () => {
  const last = calls[calls.length - 1]!;
  const url = new URL(last.url);
  assert.equal(url.origin + url.pathname, SHEET_URL);
  assert.equal(url.searchParams.get("action"), "settings");
  assert.equal(url.searchParams.get("token"), "test-token");
  assert.ok(url.searchParams.get("_ts"), "cache-buster param (proxy purani value na de)");
  assert.match(last.headers["user-agent"] ?? "", /Mozilla\/5\.0/, "browser UA (Google bot challenge se bachne ke liye)");
});

test("TTL ke andar sheet dobara nahi padhi jaati (Apps Script quota bachta hai)", async () => {
  await settle();
  handler = () => settingsReply("quota-check@ybl");
  sheets.invalidateSheetSettings();
  const first = await sheets.readSheetSettings({ fresh: true });

  calls = [];
  const second = await sheets.readSheetSettings();
  const third = await sheets.readSheetSettings();

  assert.equal(first?.upiId, "quota-check@ybl");
  assert.equal(second?.upiId, "quota-check@ybl");
  assert.equal(third?.upiId, "quota-check@ybl");
  assert.equal(calls.length, 0, "TTL (80ms) ke andar koi network call nahi");
});

test("TTL ke baad purani value turant jaati hai, nayi background me aati hai (stale-while-revalidate)", async () => {
  await settle();
  handler = () => settingsReply("owner-edited@ybl", 200);
  calls = [];

  const started = Date.now();
  const stale = await sheets.readSheetSettings(); // cache TTL (80ms) paar kar chuka hai
  const waited = Date.now() - started;

  assert.equal(stale?.upiId, "quota-check@ybl", "page ko intezaar nahi karana pada");
  assert.ok(waited < 100, `stale value turant mili (${waited}ms)`);

  // background refresh poora hone par nayi value live
  const fresh = await waitUntil(
    () => sheets.readSheetSettings(),
    (value) => value?.upiId === "owner-edited@ybl",
  );
  assert.equal(fresh?.upiId, "owner-edited@ybl", "sheet ka naya UPI ab live hai");
});

test("read fail hone par last good value rehti hai (cache null nahi hota)", async () => {
  await settle();
  sheets.invalidateSheetSettings();
  // pehle ek achhi read
  handler = () => settingsReply("last-good@ybl");
  const good = await sheets.readSheetSettings({ fresh: true });
  assert.equal(good?.upiId, "last-good@ybl");

  handler = () => ({ error: "HTTP 503 — script down" });
  const afterFailure = await sheets.readSheetSettings({ fresh: true });

  assert.equal(afterFailure?.upiId, "last-good@ybl", "site default UPI par nahi giri");
  const info = sheets.sheetSettingsInfo();
  assert.match(info.lastError ?? "", /503/, "error diagnostics me dikhta hai");
  assert.equal(info.source, "apps-script");
});

test("Apps Script down + published CSV set ho to CSV se padhta hai (source: csv)", async () => {
  await settle();
  process.env.GOOGLE_SHEETS_SETTINGS_CSV_URL = CSV_URL;
  sheets.invalidateSheetSettings();
  handler = (url) =>
    url.startsWith(CSV_URL)
      ? { text: ["key,value", "upi_id,csv-fallback@ybl", "whatsapp,"].join("\n") }
      : { error: "script down" };

  const value = await sheets.readSheetSettings({ fresh: true });

  assert.equal(value?.upiId, "csv-fallback@ybl");
  assert.equal(sheets.sheetSettingsInfo().source, "csv");
  delete process.env.GOOGLE_SHEETS_SETTINGS_CSV_URL;
});

test("kuch bhi configured nahi ho to null (site DB/defaults par chalti rahe)", async () => {
  const url = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  delete process.env.GOOGLE_SHEETS_WEBAPP_URL;
  sheets.invalidateSheetSettings();
  calls = [];

  const value = await sheets.readSheetSettings();

  assert.equal(value, null);
  assert.equal(calls.length, 0, "bina config koi network call nahi");
  process.env.GOOGLE_SHEETS_WEBAPP_URL = url;
});

/* ─────────────────────── 3. sheet jeeti hai (merge) ─────────────────────── */

test("owner ka sheet edit merged settings me turant jeetta hai", async () => {
  await settle();
  sheets.invalidateSheetSettings();
  handler = () => ({
    body: {
      ok: true,
      settings: {
        upi_id: "owner-final@ybl",
        upi_name: "Noor Ethnic Wear Store",
        announcement: "Sheet se live announcement",
        whatsapp: "9999900000",
        free_shipping: "false",
      },
    },
  });

  const settings = await store.getStoreSettings({ fresh: true });

  assert.equal(settings.upiId, "owner-final@ybl");
  assert.equal(settings.upiName, "Noor Ethnic Wear Store");
  assert.equal(settings.announcement, "Sheet se live announcement");
  assert.equal(settings.whatsapp, "9999900000");
  assert.equal(settings.freeShipping, false);
  assert.equal(settings.updatedBy, "google-sheet");
});
