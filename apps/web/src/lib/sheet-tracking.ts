import type { SheetTracking } from "./sheet-merge";

import { runInBackground } from "./background";
import { googleSheetsConfig, SHEET_REQUEST_HEADERS } from "./google-sheets";

export type { SheetTracking, SheetTrackingUpdate } from "./sheet-merge";
export { mergeSheetTracking, sheetStatusToOrderStatus, sheetTrackingWins } from "./sheet-merge";

/**
 * Sheet = order ka DB (owner, R37) — fetch + cache layer.
 * Pure merge logic `sheet-merge.ts` me hai (unit tests wahan se import karte hain,
 * kyunki ye file `server-only` google-sheets.ts ko chhoo-ti hai).
 *
 * Instant = TTL (3-5s) + stale-while-revalidate (background refresh) + `?fresh=1`.
 */

const TTL_MS = Number(process.env.SHEET_TRACKING_TTL_MS ?? 2_000);
const STALE_MAX_MS = 10 * 60_000;
const READ_TIMEOUT_MS = Number(process.env.SHEET_READ_TIMEOUT_MS ?? 4_000);

type CacheEntry = { at: number; value: SheetTracking | null };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<SheetTracking | null>>();

async function fetchTimeline(orderNumber: string, phone: string): Promise<SheetTracking | null> {
  const config = googleSheetsConfig();
  if (!config) return null;
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (!digits) return null;
  try {
    const endpoint = new URL(config.url);
    endpoint.searchParams.set("action", "timeline");
    endpoint.searchParams.set("order", orderNumber);
    endpoint.searchParams.set("phone", digits);
    if (config.token) endpoint.searchParams.set("token", config.token);
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: SHEET_REQUEST_HEADERS,
      signal: AbortSignal.timeout(Math.min(READ_TIMEOUT_MS, 4_000)),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Partial<SheetTracking> & { ok?: boolean };
    if (!payload?.ok) return null;
    return {
      orderNumber: String(payload.orderNumber ?? orderNumber),
      status: String(payload.status ?? ""),
      step: Number(payload.step ?? 0),
      steps: Array.isArray(payload.steps) ? payload.steps : [],
      paymentStatus: String(payload.paymentStatus ?? ""),
      courier: String(payload.courier ?? ""),
      awb: String(payload.awb ?? ""),
      trackingUrl: String(payload.trackingUrl ?? ""),
      note: String(payload.note ?? ""),
      adminNote: String(payload.adminNote ?? ""),
      updates: Array.isArray(payload.updates) ? payload.updates : [],
      readAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Sheet se order ka live tracking. `fresh: true` = cache bypass (owner ka
 * "instant means instant" test). Fail ho to `null` → DB wala status chalta hai.
 */
export async function readSheetTracking(
  orderNumber: string,
  phone: string,
  options: { fresh?: boolean } = {},
): Promise<SheetTracking | null> {
  const key = `${orderNumber.toUpperCase()}|${phone.replace(/\D/g, "").slice(-10)}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (!options.fresh && hit && now - hit.at < TTL_MS) return hit.value;

  const stale = hit && now - hit.at < STALE_MAX_MS ? hit.value : null;
  if (!options.fresh && stale) {
    // stale-while-revalidate: purana sahi jawab turant, taaza background me
    if (!inflight.has(key)) {
      const pending = fetchTimeline(orderNumber, phone).then((value) => {
        cache.set(key, { at: Date.now(), value });
        inflight.delete(key);
        return value;
      });
      inflight.set(key, pending);
      runInBackground(() => pending.then(() => undefined));
    }
    return stale;
  }

  const pending = inflight.get(key) ?? fetchTimeline(orderNumber, phone);
  inflight.set(key, pending as Promise<SheetTracking | null>);
  const value = await (pending as Promise<SheetTracking | null>);
  inflight.delete(key);
  cache.set(key, { at: Date.now(), value });
  return value;
}
