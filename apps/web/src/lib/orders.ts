import "server-only";

import fs from "@/lib/fs-runtime";
import { randomUUID } from "node:crypto";
import type { AuditEntry, InvoiceMeta, Order, OrderStatus, PaymentMethod, Tracking } from "@noor/types";
import {
  IDEMPOTENCY_TTL_MS,
  canTransition,
  computeDiscount,
  generateOrderNumber,
  invoiceNumber,
} from "@noor/validation";
import { runInBackground } from "./background";
import { dataFile } from "./data-dir";
import { dbEnabled } from "./db";
import { checkPincode } from "./delivery";
import { canonicalStateName, statesMatch } from "./state-match";
import { products } from "./store";
import { syncOrderToSheet, syncShipmentToSheet } from "./google-sheets";
import { cleanAwb, courierTrackingUrl } from "./tracking";

type StoredOrder = Order;

/**
 * Data backend.
 *
 * `DATABASE_URL` set hai to Postgres (production/Render), warna local JSON file
 * (dev + tests). Dono ka behaviour same hai — baaki code ko farq nahi padta.
 */
let lastLoaded: StoredOrder[] = [];
/** read ke waqt ka snapshot — in-memory array mutate hone se diff kharab na ho */
let lastSnapshot = new Map<string, string>();
let hydrated = false;

function readJson(): StoredOrder[] {
  const file = dataFile("orders.json");
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as StoredOrder[];
  } catch {
    return [];
  }
}

function writeJson(orders: StoredOrder[]) {
  const file = dataFile("orders.json");
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
  fs.renameSync(tmp, file); // atomic write -> partial file kabhi nahi
}

/** Pehli baar: purana JSON ledger (agar hai) Postgres me import kar do. */
async function hydrateOnce() {
  if (hydrated) return;
  hydrated = true;
  const { importOrders, loadOrders } = await import("./orders-pg");
  const existing = await loadOrders();
  if (existing.length) return;
  const legacy = readJson();
  if (legacy.length) {
    const imported = await importOrders(legacy);
    console.info(`[orders] ${imported} purane orders Postgres me import hue`);
  }
}

async function readAll(): Promise<StoredOrder[]> {
  if (dbEnabled()) {
    await hydrateOnce();
    const { loadOrders } = await import("./orders-pg");
    lastLoaded = await loadOrders();
    lastSnapshot = new Map(lastLoaded.map((order) => [order.orderNumber, JSON.stringify(order)]));
    return lastLoaded;
  }
  return readJson();
}

async function writeAll(orders: StoredOrder[]) {
  if (dbEnabled()) {
    const { saveOrders } = await import("./orders-pg");
    await saveOrders(lastSnapshot, orders);
    lastLoaded = orders;
    lastSnapshot = new Map(orders.map((order) => [order.orderNumber, JSON.stringify(order)]));
    return;
  }
  writeJson(orders);
}

export interface CreateOrderPayload {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string | null;
  couponCode?: string | null;
  paymentMethod: PaymentMethod;
  items: { handle: string; size: string; quantity: number }[];
  /** admin ke manual/phone orders par pincode serviceability check skip (admin ne khud confirm kiya) */
  skipPincodeCheck?: boolean;
}

/**
 * Order numbers case-insensitive hain — WhatsApp/email me lowercase aaye to bhi
 * wahi order khule. Space/dash ke aage-peeche ka junk trim ho jaata hai.
 */
export function normalizeOrderNumber(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "order_error",
  ) {
    super(message);
  }
}

/** price server par recompute hota hai — client ke bheje hue amount par bharosa nahi */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  if (!payload.items.length) throw new OrderError("Cart khaali hai.", 400, "empty_cart");

  // delivery serviceability — sirf admin-approved states/pincodes par order
  // (India Post data me na ho, blocked ho ya state band ho to yahin ruk jaata hai)
  if (!payload.skipPincodeCheck) {
    const serviceability = await checkPincode(payload.pincode);
    if (!serviceability.serviceable) {
      throw new OrderError(serviceability.message, 400, "pincode_not_serviceable");
    }
    /**
     * Owner rule: pincode jis state ka hai, wahi state hona chahiye. Client me
     * bhi guard hai, par server par bhi check hota hai — galat state se GST
     * place-of-supply aur courier zone dono galat ho jaate hain.
     */
    const pinState = canonicalStateName(serviceability.state) ?? serviceability.state;
    if (pinState && !statesMatch(payload.state, pinState)) {
      throw new OrderError(
        `Ye pincode ${pinState} ka hai — State me "${pinState}" daaliye (aapne "${payload.state}" bheja hai).`,
        400,
        "state_mismatch",
      );
    }
  }

  const items = payload.items.map((line) => {
    const product = products.find((candidate) => candidate.handle === line.handle);
    if (!product) throw new OrderError(`Product nahi mila: ${line.handle}`, 400, "product_not_found");
    // product-level stock — colour group ke sab sizes khatam ho to kuch bhi na bike
    if (product.inStock === false) {
      throw new OrderError(`${product.title} abhi sold out hai.`, 409, "product_unavailable");
    }
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new OrderError(`Quantity 1 se 10 ke beech honi chahiye (${product.title}).`, 400, "invalid_item");
    }
    // size silently badalna galat order deta hai — customer ko saaf error do
    if (!product.sizes.includes(line.size)) {
      throw new OrderError(
        `${product.title} me size "${line.size}" available nahi hai. Options: ${product.sizes.join(", ")}`,
        400,
        "invalid_item",
      );
    }
    const size = line.size;
    // size ke hisaab se price (XL +100 … 5XL +500) — cart me jo dikhta hai wahi charge hota hai
    const sizePricing = product.sizePricing?.[size];
    if (sizePricing && sizePricing.available === false) {
      throw new OrderError(`${product.title} ka size ${size} abhi sold out hai.`, 400, "size_unavailable");
    }
    // koi bhi size stock me na ho to product hi unavailable hai
    const anySizeAvailable = product.sizes.some((option) => {
      const pricing = product.sizePricing?.[option];
      return pricing ? pricing.available !== false : true;
    });
    if (!anySizeAvailable) {
      throw new OrderError(`${product.title} abhi sold out hai.`, 409, "product_unavailable");
    }
    return {
      handle: product.handle,
      title: product.title,
      image: product.images[0] ?? "",
      size,
      quantity,
      price: sizePricing?.price ?? product.price,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = computeDiscount(subtotal, payload.couponCode);

  /**
   * Site **prepaid-only** hai (owner ka rule). Pehle API COD accept karta tha —
   * koi bhi client `paymentMethod: "cod"` bhej kar bina payment order bana sakta tha.
   * Ab server par hard block; purane COD orders padhne/invoice ke liye code safe hai.
   */
  if (payload.paymentMethod === "cod") {
    throw new OrderError(
      "Cash on Delivery available nahi hai — sirf prepaid (UPI) orders accept hote hain.",
      400,
      "cod_not_allowed",
    );
  }
  const total = Math.max(0, subtotal - discount);

  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    orderNumber: generateOrderNumber(),
    createdAt: now,
    customerName: payload.customerName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    notes: payload.notes ?? null,
    items,
    subtotal,
    discount,
    shipping: 0,
    total,
    couponCode: payload.couponCode ?? null,
    paymentMethod: payload.paymentMethod,
    paymentStatus: "pending",
    payment: {
      gateway: "pending",
      reference: null,
      amount: total,
      status: "pending",
      createdAt: now,
      verifiedAt: null,
      verifiedBy: null,
      failureReason: null,
    },
    status: "placed",
    audit: [
      {
        at: now,
        actor: "customer",
        action: "order.placed",
        meta: { paymentMethod: payload.paymentMethod, total },
      },
    ],
  };

  /**
   * Performance: pehle yahan poora ledger padha jaata tha (`readAll`) aur phir
   * dobara likha jaata tha. Ek order insert karne ke liye poora history load karna
   * bekaar tha — ab DB mode me seedha ek upsert.
   */
  if (dbEnabled()) {
    const { saveOrders } = await import("./orders-pg");
    await saveOrders(new Map(), [order]);
  } else {
    const all = readJson();
    all.unshift(order);
    writeJson(all);
  }
  lastLoaded = [order, ...lastLoaded];
  lastSnapshot.set(order.orderNumber, JSON.stringify(order));
  /**
   * Google Sheet rows **background me** jaati hain. Pehle `await` tha, isliye
   * customer "Place order" ke baad 6-12 second (do Apps Script calls) rukta tha —
   * ab order turant banta hai aur Sheet rows baad me likhi jaati hain
   * (Postgres hi source of truth hai, sheet sirf owner ke liye copy).
   */
  const sheetRow = (event: string) =>
    syncOrderToSheet(order, event).catch((error) =>
      console.warn("[sheets] background sync failed", (error as Error).message),
    );
  runInBackground(() => sheetRow("order.placed"));
  runInBackground(() => sheetRow("payment.pending"));
  return order;
}

export async function listOrders(): Promise<Order[]> {
  return await readAll();
}

export async function getOrder(orderNumberValue: string): Promise<Order | undefined> {
  const wanted = normalizeOrderNumber(orderNumberValue);
  /**
   * Performance: pehle yahan `readAll()` tha, jo **poore ledger** ko DB se load
   * karta tha — payment page (step 3) isi wajah se 2-4 second leta tha. Ab DB
   * mode me sirf wahi ek row padhi jaati hai (order_number unique index).
   */
  if (dbEnabled()) {
    const { loadOrder } = await import("./orders-pg");
    return (await loadOrder(wanted)) ?? undefined;
  }
  return readJson().find((order) => order.orderNumber === wanted);
}

export async function updateOrderStatus(
  orderNumberValue: string,
  status: OrderStatus,
  actor = "admin",
  note?: string,
): Promise<Order> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order nahi mila", 404, "order_not_found");
  const order = all[index]!;
  /**
   * Payment pehle, dispatch baad me (owner rule): paisa verify hone se pehle order
   * packed/shipped/delivered nahi ho sakta. Cancel/return allowed rehte hain.
   */
  if (order.paymentStatus !== "paid" && !["cancelled", "returned", "placed"].includes(status)) {
    throw new OrderError(
      `Payment abhi ${order.paymentStatus} hai — pehle payment confirm kariye, phir order ${status} hoga.`,
      409,
      "payment_pending",
    );
  }
  if (!canTransition(order.status, status)) {
    throw new OrderError(
      `Order ${orderNumberValue} ka status ${order.status} se ${status} nahi ho sakta.`,
      409,
      "invalid_transition",
    );
  }
  const entry: AuditEntry = {
    at: new Date().toISOString(),
    actor,
    action: `order.status.${status}`,
    meta: note ? { note } : undefined,
  };
  const updated: Order = {
    ...order,
    status,
    paymentStatus:
      status === "delivered" && order.paymentMethod === "cod" ? "paid" : order.paymentStatus,
    audit: [entry, ...order.audit],
  };
  all[index] = updated;
  await writeAll(all);
  await syncOrderToSheet(updated, `order.status.${status}`);
  return updated;
}

/* ------------------------------------------------------------------ *
 * Live note — admin likhta hai "abhi kahan atka hai", customer ko wahi
 * tracking page par dikhta hai (status ke saath).
 * ------------------------------------------------------------------ */

export async function setStatusNote(
  orderNumberValue: string,
  text: string,
  actor = "admin",
): Promise<Order> {
  const clean = String(text ?? "").trim().slice(0, 240);
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order nahi mila", 404, "order_not_found");
  const order = all[index]!;
  const now = new Date().toISOString();

  const updated: Order = {
    ...order,
    // khaali text = note hata do
    statusNote: clean ? { text: clean, at: now, by: actor, status: order.status } : null,
    audit: [
      {
        at: now,
        actor,
        action: clean ? "order.note_updated" : "order.note_cleared",
        meta: clean ? { text: clean } : undefined,
      },
      ...order.audit,
    ],
  };
  all[index] = updated;
  await writeAll(all);
  return updated;
}

/* ------------------------------------------------------------------ *
 * Tracking — admin courier/AWB daalta hai, customer track page dikhata hai.
 * ------------------------------------------------------------------ */

export async function setTracking(
  orderNumberValue: string,
  input: { courier?: string | null; awb?: string | null; url?: string | null },
  actor = "admin",
): Promise<Order> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order nahi mila", 404, "order_not_found");
  const order = all[index]!;
  const now = new Date().toISOString();
  const courier = input.courier?.trim() || null;
  // AWB hamesha saaf (spaces/underscore hata ke uppercase) — courier link isi se banta hai
  const awb = cleanAwb(input.awb) || null;
  // admin URL khaali chhode to courier + AWB se link khud ban jaata hai (customer ko dead-end nahi)
  const url = input.url?.trim() || courierTrackingUrl(courier, awb);

  const tracking: Tracking = {
    courier,
    awb,
    url,
    shippedAt: order.tracking?.shippedAt ?? (courier || awb ? now : null),
    deliveredAt: order.tracking?.deliveredAt ?? (order.status === "delivered" ? now : null),
    updatedAt: now,
    updatedBy: actor,
  };

  const updated: Order = {
    ...order,
    tracking,
    audit: [
      {
        at: now,
        actor,
        action: "order.tracking_updated",
        meta: { courier, awb, url },
      },
      ...order.audit,
    ],
  };
  all[index] = updated;
  await writeAll(all);
  await syncOrderToSheet(updated, "order.tracking_updated");
  // Shipments tab — owner ko dispatch list (courier / AWB / status)
  await syncShipmentToSheet(updated, updated.status).catch((error) =>
    console.warn("[sheets] shipment sync failed", (error as Error).message),
  );
  return updated;
}

/* ------------------------------------------------------------------ *
 * GST invoice — serial ek baar issue hone par lock.
 * ------------------------------------------------------------------ */

type InvoiceSequence = { next: number };

async function nextInvoiceSerial(): Promise<number> {
  // DB mode: serials invoices table se aate hain, isliye deploy/restart par number repeat nahi hota
  if (dbEnabled()) {
    const { query } = await import("./db");
    const rows = await query<{ next: number }>(
      "select coalesce(max(nullif(regexp_replace(number, '^.*/', ''), '')::int), 0) + 1 as next from invoices",
    );
    return Number(rows[0]?.next ?? 1) || 1;
  }
  const file = dataFile("invoice-seq.json");
  let state: InvoiceSequence = { next: 1 };
  if (fs.existsSync(file)) {
    try {
      state = JSON.parse(fs.readFileSync(file, "utf8")) as InvoiceSequence;
    } catch {
      state = { next: 1 };
    }
  }
  const serial = Math.max(1, Number(state.next) || 1);
  fs.writeFileSync(`${file}.${process.pid}.tmp`, JSON.stringify({ next: serial + 1 }, null, 2));
  fs.renameSync(`${file}.${process.pid}.tmp`, file);
  return serial;
}

/** Invoice meta assign karta hai (idempotent — dobara call par wahi number). */
export async function ensureInvoice(orderNumberValue: string): Promise<{ order: Order; invoice: InvoiceMeta }> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order nahi mila", 404, "order_not_found");
  const order = all[index]!;
  if (order.invoice) return { order, invoice: order.invoice };

  const issuedAt = new Date().toISOString();
  const serial = await nextInvoiceSerial();
  const invoice: InvoiceMeta = {
    number: invoiceNumber(serial, new Date(issuedAt)),
    issuedAt,
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    gstRate: 0,
    hsn: process.env.GST_HSN ?? "6204",
    placeOfSupply: order.state || "Rajasthan",
  };
  const updated: Order = {
    ...order,
    invoice,
    audit: [{ at: issuedAt, actor: "system", action: "invoice.issued", meta: { number: invoice.number } }, ...order.audit],
  };
  all[index] = updated;
  await writeAll(all);
  return { order: updated, invoice };
}

export async function markPaymentPaid(orderNumberValue: string, reference: string): Promise<Order | undefined> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) return undefined;
  const order = all[index]!;
  const now = new Date().toISOString();
  all[index] = {
    ...order,
    paymentStatus: "paid",
    status: order.status === "placed" ? "confirmed" : order.status,
    payment: {
      gateway: order.payment?.gateway ?? "manual-upi",
      reference: reference || order.payment?.reference || null,
      upiUri: order.payment?.upiUri ?? null,
      amount: order.payment?.amount ?? order.total,
      status: "paid",
      createdAt: order.payment?.createdAt ?? now,
      verifiedAt: now,
      verifiedBy: "admin",
      failureReason: null,
    },
    audit: [
      {
        at: now,
        actor: "webhook",
        action: "payment.paid",
        meta: { reference },
      },
      ...order.audit,
    ],
  };
  await writeAll(all);
  await syncOrderToSheet(all[index]!, "payment.paid");
  return all[index];
}

/**
 * Admin: customer ki contact/delivery details theek karna (galat naam/phone/
 * pincode, customer ka call par address change). History nahi badalti — sirf
 * order ka snapshot + audit entry.
 */
export async function updateOrderContact(
  orderNumberValue: string,
  input: {
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  },
  actor = "admin",
): Promise<Order> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order nahi mila", 404, "order_not_found");
  const order = all[index]!;

  const text = (value: string | undefined, current: string, min = 1, max = 240) => {
    if (value === undefined) return current;
    const clean = String(value).replace(/\s+/g, " ").trim().slice(0, max);
    return clean.length >= min ? clean : current;
  };
  const pincode = input.pincode === undefined
    ? order.pincode
    : String(input.pincode).replace(/\D/g, "").slice(0, 6);

  const changed: Record<string, { from: string; to: string }> = {};
  const next = {
    customerName: text(input.customerName, order.customerName, 2, 80),
    email: text(input.email, order.email, 5, 120),
    phone: text(input.phone, order.phone, 10, 15).replace(/\D/g, "").slice(-10) || order.phone,
    address: text(input.address, order.address, 8, 400),
    city: text(input.city, order.city, 2, 80),
    state: text(input.state, order.state, 2, 80),
    pincode: /^[1-9]\d{5}$/.test(pincode) ? pincode : order.pincode,
  };
  (Object.keys(next) as (keyof typeof next)[]).forEach((key) => {
    if (next[key] !== order[key]) changed[key] = { from: String(order[key]), to: String(next[key]) };
  });
  if (!Object.keys(changed).length) return order;

  const updated: Order = {
    ...order,
    ...next,
    audit: [
      { at: new Date().toISOString(), actor, action: "order.contact_updated", meta: { changed } },
      ...order.audit,
    ],
  };
  all[index] = updated;
  await writeAll(all);
  return updated;
}

/**
 * Customer kehta hai "paisa kat gaya, par UTR nahi mila".
 *
 * UPI app band ho gaya / UTR screen miss ho gaya — customer ko payment page par
 * atakna nahi chahiye. Order `processing` (verify hona baaki) ho jaata hai,
 * reference khaali rehta hai, aur owner ki Sheet me `payment.claimed` row jaati
 * hai taaki admin bank/UPI statement se match karke confirm kar sake.
 */
export async function claimPayment(
  orderNumberValue: string,
  options: { note?: string | null } = {},
): Promise<Order> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order not found.", 404, "order_not_found");
  const order = all[index]!;
  if (order.paymentStatus === "paid") {
    throw new OrderError("This order is already paid.", 409, "already_paid");
  }
  const now = new Date().toISOString();
  const note = (options.note ?? "").trim().slice(0, 180);
  const updated: Order = {
    ...order,
    paymentStatus: "processing",
    payment: {
      gateway: order.payment?.gateway && order.payment.gateway !== "pending" ? order.payment.gateway : "manual-upi",
      reference: order.payment?.reference ?? null,
      upiUri: order.payment?.upiUri ?? null,
      amount: order.payment?.amount ?? order.total,
      status: "processing",
      createdAt: order.payment?.createdAt ?? now,
      verifiedAt: null,
      verifiedBy: null,
      failureReason: null,
    },
    audit: [
      {
        at: now,
        actor: "customer",
        action: "payment.claimed",
        meta: note ? { no_reference: true, note } : { no_reference: true },
      },
      ...order.audit,
    ],
  };
  all[index] = updated;
  await writeAll(all);
  runInBackground(() => syncOrderToSheet(updated, "payment.claimed"));
  return updated;
}

/**
 * Customer UPI app se pay karke reference (UTR) submit karta hai.
 * Paisa verify admin karta hai — status tab tak `pending` hi rehta hai.
 */
export async function submitPaymentReference(
  orderNumberValue: string,
  reference: string,
): Promise<Order> {
  const all = await readAll();
  const wanted = normalizeOrderNumber(orderNumberValue);
  const index = all.findIndex((order) => order.orderNumber === wanted);
  if (index === -1) throw new OrderError("Order not found.", 404, "order_not_found");
  const order = all[index]!;
  if (order.paymentStatus === "paid") {
    throw new OrderError("This order is already paid.", 409, "already_paid");
  }
  // Ek UTR = ek payment. Dusre order par wahi reference = duplicate claim.
  // Pehle DB ka unique index isko 500 bana deta tha (customer ko laga save hi nahi hua).
  const clash = all.find(
    (other) => other.orderNumber !== wanted && other.payment?.reference === reference,
  );
  if (clash) {
    throw new OrderError(
      "Ye UPI reference pehle se doosre order par use ho chuka hai. Payment app se sahi UTR daaliye, ya WhatsApp par sampark kariye.",
      409,
      "reference_in_use",
    );
  }
  const now = new Date().toISOString();
  const alreadySame = order.payment?.reference === reference;
  const updated: Order = {
    ...order,
    // customer ne UTR daal diya — paisa verify hona baaki hai (DB me 'processing')
    paymentStatus: "processing",
    payment: {
      gateway: "manual-upi",
      reference,
      upiUri: order.payment?.upiUri ?? null,
      amount: order.payment?.amount ?? order.total,
      status: "processing",
      createdAt: order.payment?.createdAt ?? now,
      verifiedAt: null,
      verifiedBy: null,
      failureReason: null,
    },
    audit: [
      {
        at: now,
        actor: "customer",
        action: "payment.reference_submitted",
        meta: { reference },
      },
      ...order.audit,
    ],
  };
  all[index] = updated;
  await writeAll(all);
  if (!alreadySame) await syncOrderToSheet(updated, "payment.reference_submitted");
  return updated;
}


/* ------------------------------------------------------------------ *
 * Idempotency — double click / retry par ek hi order.
 * File me rakha jaata hai taaki server restart par bhi key zinda rahe.
 * ------------------------------------------------------------------ */

type IdempotencyRecord = { key: string; orderNumber: string; at: string };

function readIdempotency(): IdempotencyRecord[] {
  const file = dataFile("idempotency.json");
  if (!fs.existsSync(file)) return [];
  try {
    const rows = JSON.parse(fs.readFileSync(file, "utf8")) as IdempotencyRecord[];
    const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
    return rows.filter((row) => new Date(row.at).getTime() > cutoff);
  } catch {
    return [];
  }
}

function writeIdempotency(rows: IdempotencyRecord[]) {
  const file = dataFile("idempotency.json");
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, file);
}

export async function findIdempotentOrder(key: string): Promise<Order | undefined> {
  if (dbEnabled()) {
    const { query } = await import("./db");
    const rows = await query<{ order_number: string }>(
      "select order_number from orders where idempotency_key = $1 limit 1",
      [key],
    );
    return rows[0] ? getOrder(rows[0].order_number) : undefined;
  }
  const record = readIdempotency().find((row) => row.key === key);
  return record ? await getOrder(record.orderNumber) : undefined;
}

export async function rememberIdempotency(key: string, orderNumberValue: string): Promise<void> {
  if (dbEnabled()) {
    const { query } = await import("./db");
    await query("update orders set idempotency_key = $1 where order_number = $2", [key, orderNumberValue]);
    return;
  }
  const rows = readIdempotency().filter((row) => row.key !== key);
  rows.push({ key, orderNumber: orderNumberValue, at: new Date().toISOString() });
  writeIdempotency(rows);
}

/* ─────────────────────── payment verification (server-only) ───────────────────────
 * Client kabhi "paid" nahi bol sakta: yahan sirf backend likhta hai — webhook +
 * gateway API verify ke baad. Tabhi order "placed" se "confirmed" jaata hai. */

export async function applyPaymentIntent(
  orderNumber: string,
  intent: { gateway: string; reference: string | null; upiUri: string | null; amount: number },
): Promise<Order | null> {
  const orders = await readAll();
  const index = orders.findIndex((order) => order.orderNumber === normalizeOrderNumber(orderNumber));
  if (index === -1) return null;
  const order = orders[index]!;
  if (order.paymentStatus === "paid") return order; // dobara intent banane ki zaroorat nahi
  orders[index] = {
    ...order,
    payment: {
      gateway: intent.gateway,
      reference: intent.reference,
      upiUri: intent.upiUri,
      amount: intent.amount,
      status: "processing",
      createdAt: order.payment?.createdAt ?? new Date().toISOString(),
      verifiedAt: null,
      verifiedBy: null,
      failureReason: null,
    },
  };
  await writeAll(orders);
  return orders[index]!;
}

/** Backend verify ke baad hi called hota hai. Idempotent: dobara aane par kuch nahi badalta. */
export async function confirmPayment(
  orderNumber: string,
  input: { gateway: string; reference: string | null; amount: number; actor: string; auto?: boolean },
): Promise<{ order: Order; alreadyPaid: boolean } | null> {
  const orders = await readAll();
  const index = orders.findIndex((order) => order.orderNumber === normalizeOrderNumber(orderNumber));
  if (index === -1) return null;
  const order = orders[index]!;
  if (order.paymentStatus === "paid") return { order, alreadyPaid: true };

  const now = new Date().toISOString();
  const paidOrder: Order = {
    ...order,
    paymentStatus: "paid",
    // payment mil gaya -> order confirm (agar already aage nahi badh chuka)
    status: order.status === "placed" && canTransition("placed", "confirmed") ? "confirmed" : order.status,
    payment: {
      gateway: input.gateway,
      reference: input.reference,
      upiUri: order.payment?.upiUri ?? null,
      amount: input.amount,
      status: "paid",
      createdAt: order.payment?.createdAt ?? now,
      verifiedAt: now,
      verifiedBy: input.actor,
      failureReason: null,
    },
    audit: [
      {
        at: now,
        actor: input.actor,
        action: input.auto ? "payment.auto_confirmed" : "payment.verified",
        meta: { gateway: input.gateway, reference: input.reference, amount: input.amount },
      },
      ...(order.status === "placed"
        ? [{ at: now, actor: input.actor, action: "order.status.confirmed", meta: { reason: "payment received" } }]
        : []),
      ...order.audit,
    ],
  };
  orders[index] = paidOrder;
  await writeAll(orders);
  await syncOrderToSheet(paidOrder, input.auto ? "payment.auto_confirmed" : "payment.paid");
  return { order: paidOrder, alreadyPaid: false };
}

/**
 * Owner ne bank me credit nahi dekha → payment ko wapas "pending" kar do.
 * UPI-return auto-confirm ko undo karne ke liye (admin panel → order → Not received).
 * Shipped/delivered order par payment status nahi chhedte — wahan sirf note chalta hai.
 */
export async function reversePayment(
  orderNumber: string,
  input: { actor: string; reason: string },
): Promise<Order | null> {
  const orders = await readAll();
  const index = orders.findIndex((order) => order.orderNumber === normalizeOrderNumber(orderNumber));
  if (index === -1) return null;
  const order = orders[index]!;
  if (order.paymentStatus !== "paid") return order;

  const now = new Date().toISOString();
  const reason = input.reason.trim().slice(0, 200) || "payment not received";
  const backToPlaced = order.status === "confirmed";
  orders[index] = {
    ...order,
    paymentStatus: "pending",
    status: backToPlaced ? "placed" : order.status,
    payment: {
      gateway: order.payment?.gateway ?? "upi-return",
      reference: order.payment?.reference ?? null,
      upiUri: order.payment?.upiUri ?? null,
      amount: order.payment?.amount ?? order.total,
      status: "pending",
      createdAt: order.payment?.createdAt ?? now,
      verifiedAt: null,
      verifiedBy: null,
      failureReason: reason,
    },
    audit: [
      { at: now, actor: input.actor, action: "payment.reversed", meta: { reason } },
      ...(backToPlaced
        ? [{ at: now, actor: input.actor, action: "order.status.placed", meta: { reason: "payment reversed" } }]
        : []),
      ...order.audit,
    ],
  };
  await writeAll(orders);
  await syncOrderToSheet(orders[index]!, "payment.reversed");
  return orders[index]!;
}

export async function failPayment(
  orderNumber: string,
  input: { gateway: string; reference: string | null; reason: string },
): Promise<Order | null> {
  const orders = await readAll();
  const index = orders.findIndex((order) => order.orderNumber === normalizeOrderNumber(orderNumber));
  if (index === -1) return null;
  const order = orders[index]!;
  if (order.paymentStatus === "paid") return order;
  const now = new Date().toISOString();
  orders[index] = {
    ...order,
    paymentStatus: "failed",
    payment: {
      gateway: input.gateway,
      reference: input.reference,
      amount: order.payment?.amount ?? order.total,
      status: "failed",
      createdAt: order.payment?.createdAt ?? now,
      verifiedAt: null,
      verifiedBy: null,
      upiUri: order.payment?.upiUri ?? null,
      failureReason: input.reason.slice(0, 200),
    },
    audit: [
      { at: now, actor: "gateway", action: "payment.failed", meta: { gateway: input.gateway, reason: input.reason } },
      ...order.audit,
    ],
  };
  await writeAll(orders);
  await syncOrderToSheet(orders[index]!, "payment.failed");
  return orders[index]!;
}

/** Customer-facing status — payment ka internal detail nahi jaata */
export async function paymentStatusFor(orderNumber: string) {
  const wanted = normalizeOrderNumber(orderNumber);
  const order = (await readAll()).find((candidate) => candidate.orderNumber === wanted);
  if (!order) return null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    amount: order.payment?.amount ?? order.total,
    gateway: order.payment?.gateway ?? null,
    upiUri: order.paymentStatus === "paid" ? null : (order.payment?.upiUri ?? null),
    reference: order.payment?.reference ?? null,
    verifiedAt: order.payment?.verifiedAt ?? null,
    updatedAt: order.audit[0]?.at ?? order.createdAt,
  };
}
