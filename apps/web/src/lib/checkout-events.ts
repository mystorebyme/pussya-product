import "server-only";

import fs from "@/lib/fs-runtime";
import { randomUUID } from "node:crypto";
import { dataFile } from "@/lib/data-dir";
import { dbEnabled } from "@/lib/db";
import { appendSheetRows } from "@/lib/google-sheets";
import { checkoutEventSheetRow } from "@/lib/sheet-format";

/**
 * Checkout funnel ka record.
 *
 * Owner ne kaha: "koi checkout tak pahuncha, order kiya, failed kiya, success
 * kiya — wo DB matlab Google Sheet me store hona chahiye, taaki order number
 * Track Order me kaam kare."
 *
 * Isliye har stage ek row banti hai:
 *   checkout.started → customer checkout page tak pahuncha
 *   checkout.review  → delivery detail bhar kar review tak aaya (address ready)
 *   order.placed     → order bana (order number mil gaya, payment pending)
 *   order.failed     → order save nahi hua (kya error aaya, wo bhi)
 *   payment.*        → payment page alag se Payments sheet me likhta hai
 *
 * Storage: Postgres (`checkout_events`) jab `DATABASE_URL` hai, warna local JSON
 * (dev/test). Dono case me owner ki sheet me "Checkout" tab me row jaati hai.
 */

export type CheckoutEventName =
  | "checkout.started"
  | "checkout.review"
  | "order.placed"
  | "order.failed";

export const CHECKOUT_EVENTS: CheckoutEventName[] = [
  "checkout.started",
  "checkout.review",
  "order.placed",
  "order.failed",
];

export interface CheckoutEventItem {
  handle: string;
  size: string;
  quantity: number;
}

export interface CheckoutEvent {
  id: string;
  createdAt: string;
  event: string;
  step?: string | null;
  orderNumber?: string | null;
  items: CheckoutEventItem[];
  itemsCount: number;
  subtotal: number;
  reason?: string | null;
  sessionId?: string | null;
  phone?: string | null;
  userAgent?: string | null;
}

export interface CheckoutEventInput {
  event: unknown;
  step?: unknown;
  orderNumber?: unknown;
  items?: unknown;
  subtotal?: unknown;
  reason?: unknown;
  sessionId?: unknown;
  phone?: unknown;
}

type Row = {
  id: string;
  created_at: Date | string;
  event: string;
  step: string | null;
  order_number: string | null;
  items: CheckoutEventItem[] | null;
  items_count: number;
  subtotal: number;
  reason: string | null;
  session_id: string | null;
  phone: string | null;
  user_agent: string | null;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readJson(): CheckoutEvent[] {
  const file = dataFile("checkout-events.json");
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as CheckoutEvent[]) : [];
  } catch {
    return [];
  }
}

function writeJson(rows: CheckoutEvent[]) {
  const file = dataFile("checkout-events.json");
  fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, file);
}

/** client se aaya junk saaf karo — sheet/DB me sirf saaf data jaye */
function cleanItems(value: unknown): CheckoutEventItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((entry) => {
      const raw = (entry ?? {}) as Record<string, unknown>;
      const handle = String(raw.handle ?? "").trim().slice(0, 160);
      const size = String(raw.size ?? "").trim().slice(0, 40);
      const quantity = Number(raw.quantity ?? 1);
      if (!handle) return null;
      return {
        handle,
        size,
        quantity: Number.isFinite(quantity) ? Math.min(10, Math.max(1, Math.round(quantity))) : 1,
      };
    })
    .filter((item): item is CheckoutEventItem => Boolean(item));
}

export function parseCheckoutEvent(
  input: CheckoutEventInput,
  meta: { userAgent?: string | null } = {},
): CheckoutEvent | null {
  const event = String(input.event ?? "").trim() as CheckoutEventName;
  if (!CHECKOUT_EVENTS.includes(event)) return null;

  const items = cleanItems(input.items);
  const subtotal = Number(input.subtotal ?? 0);
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    event,
    step: input.step == null ? null : String(input.step).slice(0, 40),
    orderNumber: input.orderNumber == null ? null : String(input.orderNumber).trim().slice(0, 40),
    items,
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Number.isFinite(subtotal) ? Math.max(0, Math.round(subtotal)) : 0,
    reason: input.reason == null ? null : String(input.reason).slice(0, 400),
    sessionId: input.sessionId == null ? null : String(input.sessionId).slice(0, 80),
    phone: input.phone == null ? null : String(input.phone).replace(/\D/g, "").slice(-10) || null,
    userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 300) : null,
  };
}

/** Row save karo (DB ya JSON) — sheet mirror best-effort, kabhi request fail nahi karta. */
export async function saveCheckoutEvent(event: CheckoutEvent): Promise<CheckoutEvent> {
  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    await query(
      `insert into checkout_events
         (id, created_at, event, step, order_number, items, items_count, subtotal, reason, session_id, phone, user_agent)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12)
       on conflict (id) do nothing`,
      [
        event.id,
        event.createdAt,
        event.event,
        event.step ?? null,
        event.orderNumber ?? null,
        JSON.stringify(event.items),
        event.itemsCount,
        event.subtotal,
        event.reason ?? null,
        event.sessionId ?? null,
        event.phone ?? null,
        event.userAgent ?? null,
      ],
    );
  } else {
    const rows = readJson();
    rows.unshift(event);
    writeJson(rows.slice(0, 5000));
  }

  void mirrorCheckoutEventToSheet(event).catch(() => {});
  return event;
}

/** Owner ki sheet — "Checkout" tab (funnel dekhne ke liye) */
export async function mirrorCheckoutEventToSheet(event: CheckoutEvent): Promise<void> {
  await appendSheetRows([{ sheet: "Checkout", row: checkoutEventSheetRow(event) }]);
}

/** Admin ke liye recent events (latest pehle) */
export async function listCheckoutEvents(limit = 100): Promise<CheckoutEvent[]> {
  const take = Math.min(500, Math.max(1, Math.round(limit)));
  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    const rows = await query<Row>(
      `select id, created_at, event, step, order_number, items, items_count, subtotal, reason, session_id, phone, user_agent
         from checkout_events order by created_at desc limit $1`,
      [take],
    );
    return rows.map((row) => ({
      id: row.id,
      createdAt: iso(row.created_at),
      event: row.event,
      step: row.step,
      orderNumber: row.order_number,
      items: Array.isArray(row.items) ? row.items : [],
      itemsCount: row.items_count,
      subtotal: row.subtotal,
      reason: row.reason,
      sessionId: row.session_id,
      phone: row.phone,
      userAgent: row.user_agent,
    }));
  }
  return readJson().slice(0, take);
}

/** Funnel counters — admin dashboard card ke liye */
export async function checkoutFunnel(): Promise<Record<string, number>> {
  const events = await listCheckoutEvents(500);
  const counts: Record<string, number> = {
    "checkout.started": 0,
    "checkout.review": 0,
    "order.placed": 0,
    "order.failed": 0,
  };
  for (const event of events) {
    if (event.event in counts) counts[event.event] += 1;
  }
  return counts;
}
