import "server-only";

import fs from "@/lib/fs-runtime";
import type { DeliveryPinRule, DeliverySettings, Serviceability } from "@noor/types";
import { dataFile } from "./data-dir";
import { dbEnabled } from "./db";
import { deliveryStates, evaluatePincode, isPincodeFormat, normalizePincode } from "./pincodes";

/**
 * Delivery rules ka store.
 *
 * Ek hi source of truth: storefront (Postgres jab DATABASE_URL ho, warna JSON).
 * Admin panel isi ko API ke through padhta/likhta hai, isliye admin ka block
 * turant website par lagta hai — dono jagah alag data nahi rehta.
 */

const MAX_RULES = 2000;
const CACHE_MS = 5_000;

let cache: { at: number; value: DeliverySettings } | null = null;

export function defaultDeliverySettings(): DeliverySettings {
  return {
    updatedAt: new Date(0).toISOString(),
    updatedBy: "system",
    // Shuru me sab allowed — jab tak admin restrict na kare, kuch bhi na toote.
    // Lekin pincode India Post ke data me hona zaroori hai (faltu number reject).
    allowAllStates: true,
    states: {},
    blockedPincodes: [],
    allowedPincodes: [],
    deliveryDays: "4-7 business days",
    freeShipping: true,
  };
}

function readJson(): DeliverySettings | null {
  const file = dataFile("delivery.json");
  if (!fs.existsSync(file)) return null;
  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return null;
  }
}

function writeJson(settings: DeliverySettings) {
  const file = dataFile("delivery.json");
  fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
  fs.renameSync(tmp, file);
}

/** Kuch bhi galat/adhura JSON aaye to safe defaults par gir jaata hai. */
export function normalizeSettings(input: unknown): DeliverySettings {
  const base = defaultDeliverySettings();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<DeliverySettings>;

  const rules = (rows: unknown): DeliveryPinRule[] => {
    if (!Array.isArray(rows)) return [];
    const seen = new Set<string>();
    const out: DeliveryPinRule[] = [];
    for (const row of rows) {
      const pincode = normalizePincode(String((row as DeliveryPinRule)?.pincode ?? ""));
      if (!isPincodeFormat(pincode) || seen.has(pincode)) continue;
      seen.add(pincode);
      const entry = row as DeliveryPinRule;
      out.push({
        pincode,
        note: entry.note ? String(entry.note).slice(0, 120) : undefined,
        at: entry.at ?? new Date().toISOString(),
        by: entry.by,
      });
      if (out.length >= MAX_RULES) break;
    }
    return out;
  };

  const states: Record<string, boolean> = {};
  if (raw.states && typeof raw.states === "object") {
    for (const state of deliveryStates) {
      if (typeof (raw.states as Record<string, unknown>)[state] === "boolean") {
        states[state] = Boolean((raw.states as Record<string, boolean>)[state]);
      }
    }
  }

  return {
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : base.updatedBy,
    allowAllStates: raw.allowAllStates !== false,
    states,
    blockedPincodes: rules(raw.blockedPincodes),
    allowedPincodes: rules(raw.allowedPincodes),
    deliveryDays: (typeof raw.deliveryDays === "string" && raw.deliveryDays.trim()) || base.deliveryDays,
    freeShipping: raw.freeShipping !== false,
  };
}

async function load(): Promise<DeliverySettings> {
  if (dbEnabled()) {
    const { query } = await import("./db");
    const rows = await query<{ payload: DeliverySettings }>(
      "select payload from delivery_settings where id = 'default' limit 1",
    );
    return rows[0] ? normalizeSettings(rows[0].payload) : defaultDeliverySettings();
  }
  return readJson() ?? defaultDeliverySettings();
}

export async function getDeliverySettings(options: { fresh?: boolean } = {}): Promise<DeliverySettings> {
  if (!options.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = await load();
  cache = { at: Date.now(), value };
  return value;
}

export async function saveDeliverySettings(
  input: unknown,
  actor: string,
): Promise<DeliverySettings> {
  const next = normalizeSettings({
    ...(input as DeliverySettings),
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  });

  if (dbEnabled()) {
    const { query } = await import("./db");
    await query(
      `insert into delivery_settings (id, payload, updated_at) values ('default', $1::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [JSON.stringify(next)],
    );
  } else {
    writeJson(next);
  }

  cache = { at: Date.now(), value: next };
  return next;
}

/** Customer/checkout ke liye — settings + rule engine ek saath. */
export async function checkPincode(pincode: string): Promise<Serviceability & { freeShipping: boolean }> {
  const settings = await getDeliverySettings();
  const result = evaluatePincode(pincode, settings);
  return { ...result, freeShipping: settings.freeShipping };
}

/** Sirf serviceable hai ya nahi (order booking ke liye) */
export async function isServiceable(pincode: string): Promise<boolean> {
  return (await checkPincode(pincode)).serviceable;
}

/** Naye blocked/allowed rule me pincode ka state/district bhi bhar dete hain (admin UI ke liye). */
export function pinRuleReason(settings: DeliverySettings, pincode: string): string | null {
  const pin = normalizePincode(pincode);
  if (settings.blockedPincodes.some((row) => row.pincode === pin)) return "blocked";
  const state = evaluatePincode(pin, settings).state;
  if (state && !settings.allowAllStates && settings.states[state] !== true) return "state_blocked";
  return null;
}
