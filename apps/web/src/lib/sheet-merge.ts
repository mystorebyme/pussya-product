import type { AuditEntry, Order, OrderStatus } from "@noor/types";

import { cleanAwb, courierTrackingUrl } from "./tracking";

/**
 * Sheet-tracking ka **pure** hissa — koi network / server-only import nahi,
 * isliye unit tests ise seedha import kar sakte hain.
 * Fetch + cache `sheet-tracking.ts` me hai.
 */

export type SheetTrackingUpdate = {
  at: string;
  status: string;
  event: string;
  message: string;
};

export type SheetTracking = {
  orderNumber: string;
  status: string;
  step: number;
  steps: { step: string; done: boolean }[];
  paymentStatus: string;
  courier: string;
  awb: string;
  trackingUrl: string;
  note: string;
  /**
   * R39 (owner): Orders tab ke `Admin Note` column ka text — order ke liye
   * owner ka apna message. Status merge jeete ya na jeete, ye note hamesha
   * customer page ke note-box me dikhta hai (khaali ho to "Waiting for
   * confirmation"). Purane script (r38-) isay nahi bhejte — isliye optional.
   */
  adminNote?: string;
  updates: SheetTrackingUpdate[];
  readAt: number;
};

const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];
const STEP_INDEX: Record<string, number> = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
};

/** Sheet ka koi bhi status text ("Shipped", "dispatch ho gaya") → OrderStatus. */
export function sheetStatusToOrderStatus(status: unknown): OrderStatus | null {
  const value = String(status ?? "").trim().toLowerCase();
  if (!value) return null;
  if (ORDER_STATUSES.includes(value as OrderStatus)) return value as OrderStatus;
  if (/cancel|rto/.test(value)) return "cancelled";
  if (/return|refund/.test(value)) return "returned";
  if (/out for deliver/.test(value)) return "shipped";
  if (/deliver|complete|handover/.test(value)) return "delivered";
  if (/ship|dispatch|transit|courier/.test(value)) return "shipped";
  if (/pack|label|ready/.test(value)) return "packed";
  if (/confirm|process|accept/.test(value)) return "confirmed";
  if (/placed|created|pending/.test(value)) return "placed";
  return null;
}

function stepOf(status: string): number {
  const mapped = sheetStatusToOrderStatus(status);
  return mapped ? (STEP_INDEX[mapped] ?? 0) : 0;
}



/**
 * Sheet jeet-ti hai kab? (owner rule: sheet value wins)
 *  • sheet ka status rukna bataye (cancelled / returned) → hamesha
 *  • sheet ka step DB ke step se aage ya barabar → sheet
 *  • warna DB (payment-confirm jaisi cheezein sheet se pehle hoti hain)
 */
export function sheetTrackingWins(order: Order, sheet: SheetTracking | null): boolean {
  if (!sheet || !sheet.status) return false;
  const mapped = sheetStatusToOrderStatus(sheet.status);
  if (!mapped) return false;
  if (mapped === "cancelled" || mapped === "returned") return true;
  return stepOf(sheet.status) >= stepOf(order.status);
}

/**
 * DB ke order par sheet ka tracking merge — **pure** (tests isi par chalte hain).
 * Sheet jeete to status / statusNote / courier-AWB-URL aur timeline ke updates
 * sheet se aate hain; paymentStatus hamesha DB ka (paisa = DB sacchai).
 *
 * R39: sheet ka `adminNote` (Orders → Admin Note column) **hamesha** jeetta hai
 * — status merge ho ya na ho, owner ka message customer ke note-box me dikhega.
 */
export function mergeSheetTracking(order: Order, sheet: SheetTracking | null): Order {
  if (!sheet) return order;
  const merged = sheetTrackingWins(order, sheet) ? mergeSheetWins(order, sheet) : order;
  const adminNote = String(sheet.adminNote ?? "").trim();
  if (!adminNote) return merged;
  return {
    ...merged,
    statusNote: {
      text: adminNote,
      at: sheet.updates[0]?.at ?? merged.createdAt,
      by: "sheet",
      status: merged.status,
    },
  };
}

function mergeSheetWins(order: Order, sheet: SheetTracking): Order {
  const status = sheetStatusToOrderStatus(sheet.status) ?? order.status;

  const audit: AuditEntry[] = sheet.updates
    .filter((update) => update?.at)
    .map((update) => ({
      at: update.at,
      actor: "sheet",
      action: `order.status.${sheetStatusToOrderStatus(update.status) ?? "placed"}`,
      meta: { note: update.message || undefined, event: update.event || undefined },
    }))
    .reverse(); // trackingUpdates newest-first expect karta hai

  const courier = sheet.courier || order.tracking?.courier || null;
  const awb = sheet.awb ? cleanAwb(sheet.awb) : (order.tracking?.awb ?? null);
  const url =
    sheet.trackingUrl ||
    order.tracking?.url ||
    courierTrackingUrl(courier, awb ?? "");

  return {
    ...order,
    status,
    statusNote: sheet.note
      ? { text: sheet.note, at: sheet.updates[0]?.at ?? order.createdAt, by: "sheet", status }
      : order.statusNote,
    tracking:
      courier || awb || url
        ? {
            courier,
            awb,
            url,
            shippedAt: order.tracking?.shippedAt ?? (stepOf(status) >= 3 ? (sheet.updates[0]?.at ?? null) : null),
            deliveredAt: order.tracking?.deliveredAt ?? (status === "delivered" ? (sheet.updates[0]?.at ?? null) : null),
            updatedAt: sheet.updates[0]?.at ?? order.tracking?.updatedAt ?? order.createdAt,
            updatedBy: "sheet",
          }
        : order.tracking,
    audit: audit.length ? audit : order.audit,
  };
}
