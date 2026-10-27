import type { AuditEntry, Order } from "@noor/types";

import { STORE_TIME_ZONE } from "./format";

/**
 * Tracking ka poora customer-facing logic — ek jagah, pure functions me.
 *
 * Owner rule (R31): tracking "perfect" chale — matlab
 *  1. 5 step ka timeline, har step ki asli date ke saath
 *  2. admin ka per-step comment (history, sirf latest note nahi)
 *  3. courier + AWB + **seedha courier ka tracking link** (admin URL na de to
 *     bhi courier naam + AWB se link khud ban jaaye)
 *  4. cancelled / returned par saaf red banner (aadha-adhoora timeline nahi)
 *
 * File alias-free hai taaki `tests/unit` me seedha chala sake.
 */

export const TRACKING_STEPS = ["placed", "confirmed", "packed", "shipped", "delivered"] as const;
export type TrackingStep = (typeof TRACKING_STEPS)[number];

export const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/* ------------------------------------------------------------------ *
 * Courier tracking links
 * ------------------------------------------------------------------ */

type CourierRule = { match: RegExp; url: (awb: string) => string };

/**
 * Har courier ka official tracking URL pattern. Naya courier aaye to yahan ek
 * line add kar dijiye — UI, admin, sheet sab jagah apne aap chal jaayega.
 */
const COURIER_RULES: CourierRule[] = [
  { match: /delhivery/i, url: (awb) => `https://www.delhivery.com/track/package/${awb}` },
  {
    match: /blue\s*dart|bluedart/i,
    url: (awb) => `https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo=${awb}`,
  },
  { match: /dtdc/i, url: (awb) => `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${awb}&TrkType=1` },
  {
    match: /india\s*post|speed\s*post|registered\s*post/i,
    url: (awb) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment?consignmentno=${awb}`,
  },
  { match: /ekart|flipkart/i, url: (awb) => `https://ekartlogistics.com/track/${awb}` },
  {
    match: /xpress\s*bees|xpressbees/i,
    url: (awb) => `https://www.xpressbees.com/shipment/tracking?awbNo=${awb}`,
  },
  { match: /shadowfax/i, url: (awb) => `https://tracker.shadowfax.in/#/track/${awb}` },
  { match: /ecom\s*express|ecom/i, url: (awb) => `https://ecomexpress.in/tracking/?awb_field=${awb}` },
  { match: /shiprocket/i, url: (awb) => `https://shiprocket.co/tracking/${awb}` },
  { match: /professional/i, url: (awb) => `https://www.tpcindia.com/Tracking.aspx?type=0&id=${awb}` },
  { match: /amazon|ats/i, url: (awb) => `https://track.amazon.in/tracking/${awb}` },
  { match: /fedex/i, url: (awb) => `https://www.fedex.com/fedextrack/?trknbr=${awb}` },
  { match: /dhl/i, url: (awb) => `https://www.dhl.com/in-en/home/tracking.html?tracking-id=${awb}` },
];

/** AWB ko safe rakho — sirf letters/digits/dash (URL me jaata hai) */
export function cleanAwb(awb: unknown): string {
  return String(awb ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toUpperCase()
    .slice(0, 32);
}

/**
 * Courier naam + AWB se tracking link. Naam pehchana na jaaye to null
 * (jhoota link dene se behtar hai ki sirf AWB dikhe).
 */
export function courierTrackingUrl(courier: unknown, awb: unknown): string | null {
  const awbClean = cleanAwb(awb);
  if (!awbClean) return null;
  const name = String(courier ?? "").trim();
  if (!name) return null;
  const rule = COURIER_RULES.find((candidate) => candidate.match.test(name));
  return rule ? rule.url(awbClean) : null;
}

/** Order ka tracking link — admin ka diya URL pehle, warna courier se banaya hua */
export function orderTrackingUrl(order: Pick<Order, "tracking">): string | null {
  const explicit = String(order.tracking?.url ?? "").trim();
  if (/^https?:\/\//i.test(explicit)) return explicit;
  return courierTrackingUrl(order.tracking?.courier, order.tracking?.awb);
}

/** Jis courier ke link hum bana sakte hain unki list (admin form ke liye) */
export function knownCouriers(): string[] {
  return [
    "Delhivery",
    "Blue Dart",
    "DTDC",
    "India Post",
    "Ekart",
    "XpressBees",
    "Shadowfax",
    "Ecom Express",
    "Shiprocket",
    "The Professional Couriers",
    "Amazon",
    "FedEx",
    "DHL",
  ];
}

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

export type TrackingStepState = {
  step: TrackingStep;
  label: string;
  /** step ho gaya? */
  done: boolean;
  /** us step par pahunchne ka time (ISO) — nahi pata to null */
  at: string | null;
  /** us step par admin ka comment (agar diya) */
  note?: string;
};

export type TrackingUpdate = {
  at: string;
  status: string;
  label: string;
  kind: "status" | "note" | "tracking" | "payment";
  text?: string;
};

const STATUS_ACTION = /^order\.status\.([a-z]+)$/;

/**
 * 5 step ka state — har step ki date audit se nikalta hai.
 * Cancelled/returned par `stopped` set hota hai (page red banner dikhata hai,
 * jhoota aadha timeline nahi).
 */
export function trackingSteps(
  order: Pick<Order, "status" | "tracking" | "audit" | "createdAt">,
): { steps: TrackingStepState[]; currentStep: number; stopped: "cancelled" | "returned" | null } {
  const stopped = order.status === "cancelled" || order.status === "returned" ? order.status : null;
  const times = new Map<string, { at: string; note?: string }>();
  for (const entry of order.audit ?? []) {
    const match = STATUS_ACTION.exec(entry.action);
    if (!match) continue;
    const status = match[1]!;
    const existing = times.get(status);
    // sabse purana event rakho (jab pehli baar us step par pahuncha)
    if (!existing || entry.at < existing.at) {
      const note = typeof entry.meta?.note === "string" ? (entry.meta.note as string) : undefined;
      times.set(status, { at: entry.at, note });
    }
  }
  // placed ka time hamesha order ke banne ka hota hai (audit khaali ho to bhi)
  if (!times.has("placed")) times.set("placed", { at: order.createdAt });
  if (order.tracking?.shippedAt && !times.has("shipped")) {
    times.set("shipped", { at: order.tracking.shippedAt });
  }

  const currentStatus = String(order.status);
  const reached = (step: TrackingStep): boolean => {
    if (stopped) {
      // cancel hone se pehle jo step mil chuka tha wahi done rahega
      const reachedIndex = Math.max(
        ...TRACKING_STEPS.map((candidate, index) => (times.has(candidate) ? index : -1)),
        -1,
      );
      return times.has(step) || TRACKING_STEPS.indexOf(step) <= reachedIndex;
    }
    const target = TRACKING_STEPS.indexOf(step);
    const current = TRACKING_STEPS.indexOf(currentStatus as TrackingStep);
    return current >= 0 ? target <= current : times.has(step);
  };

  const steps: TrackingStepState[] = TRACKING_STEPS.map((step) => ({
    step,
    label: statusLabel(step),
    done: reached(step),
    at: times.get(step)?.at ?? null,
    note: times.get(step)?.note,
  }));

  const currentStep = stopped ? -1 : TRACKING_STEPS.indexOf(currentStatus as TrackingStep);
  return { steps, currentStep, stopped };
}

/**
 * Customer ko dikhne wali "updates" list — newest pehle.
 *
 * Status change, admin note, courier/AWB aur payment claim — sab ek hi dhaage me,
 * taaki customer ko "kab kya hua" saaf dikhe (owner rule: per-step comment).
 */
export function trackingUpdates(
  order: Pick<Order, "statusNote" | "tracking" | "audit">,
  limit = 6,
): TrackingUpdate[] {
  const updates: TrackingUpdate[] = [];
  const seen = new Set<string>();

  for (const entry of order.audit ?? []) {
    const parsed = updateFromAudit(entry);
    if (!parsed) continue;
    const key = `${parsed.status}|${parsed.text ?? ""}|${parsed.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    updates.push(parsed);
  }

  // admin ka live note hamesha sabse upar (audit me bhi hota hai, par purana ho sakta hai)
  if (order.statusNote?.text) {
    const top: TrackingUpdate = {
      at: order.statusNote.at,
      status: order.statusNote.status,
      label: statusLabel(order.statusNote.status),
      kind: "note",
      text: order.statusNote.text,
    };
    const index = updates.findIndex((update) => update.kind === "note" && update.text === top.text);
    if (index >= 0) updates.splice(index, 1);
    updates.push(top);
  }

  return updates.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}

function updateFromAudit(entry: AuditEntry): TrackingUpdate | null {
  const statusMatch = STATUS_ACTION.exec(entry.action);
  if (statusMatch) {
    const status = statusMatch[1]!;
    const note = typeof entry.meta?.note === "string" ? (entry.meta.note as string).trim() : "";
    return {
      at: entry.at,
      status,
      label: statusLabel(status),
      kind: "status",
      text: note || undefined,
    };
  }
  if (entry.action === "order.note_updated") {
    const text = typeof entry.meta?.text === "string" ? (entry.meta.text as string).trim() : "";
    if (!text) return null;
    return { at: entry.at, status: "note", label: "Team update", kind: "note", text };
  }
  if (entry.action === "order.tracking_updated") {
    const courier = typeof entry.meta?.courier === "string" ? (entry.meta.courier as string) : "";
    const awb = typeof entry.meta?.awb === "string" ? (entry.meta.awb as string) : "";
    const text = [courier, awb ? `AWB ${cleanAwb(awb)}` : ""].filter(Boolean).join(" · ");
    if (!text) return null;
    return { at: entry.at, status: "shipped", label: "Courier details", kind: "tracking", text };
  }
  if (entry.action === "payment.claimed") {
    return {
      at: entry.at,
      status: "payment",
      label: "Payment claim",
      kind: "payment",
      text: "Payment confirm request mili — team UPI statement se verify kar rahi hai.",
    };
  }
  if (entry.action === "payment.verified" || entry.action === "payment.confirmed") {
    return { at: entry.at, status: "payment", label: "Payment received", kind: "payment" };
  }
  return null;
}

/** Step ke saamne dikhne wali chhoti date — "26 Oct, 6:10 pm" (hamesha IST, R39) */
export function trackingTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  });
}

/** Delivery ka andaaza — placed + 6 din (weekend adjust nahi, simple aur honest) */
export function estimatedDelivery(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "";
  // ms jod kar + IST me format — server ke UTC date arithmetic se 1-din ki
  // galti (raat 10:30 IST baad ke orders) nahi hoti.
  const eta = new Date(created.getTime() + 6 * 86_400_000);
  return eta.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: STORE_TIME_ZONE });
}
