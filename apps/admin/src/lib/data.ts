import fs from "node:fs";
import path from "node:path";
import type {
  Catalog,
  DeliverySettings,
  ManualInvoice as ManualInvoiceType,
  ManualInvoiceItem as ManualInvoiceItemType,
  Order,
  Product,
} from "@noor/types";
import { canTransition } from "@noor/validation";
import catalogJson from "../data/catalog.json";
import { mergedProducts } from "./catalog-admin";
import { repoRoot as repoRootFromOverrides } from "./overrides";

export const repoRoot = repoRootFromOverrides;

export function dataFile(name: string): string {
  const dir = process.env.DATA_DIR ?? path.join(repoRoot(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

function readRows<T>(name: string): T[] {
  const file = dataFile(name);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

function writeRows<T>(name: string, rows: T[]) {
  const file = dataFile(name);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, file);
}

/**
 * Catalogue base JSON hai; admin ke edits ek hi jagah (`catalog-admin` overrides)
 * jaate hain — product edit page, inventory aur price form sab wahi file likhte hain,
 * isliye ek jagah kiya gaya edit doosri jagah bhi dikhta hai.
 */
export function getProducts(): Product[] {
  return mergedProducts();
}

export function getCollections() {
  return (catalogJson as unknown as Catalog).collections;
}

/**
 * Orders ka source of truth.
 *
 * - `STORE_API_URL` set hai (Render par storefront + admin alag services hain):
 *   orders storefront se aate hain aur status/tracking wahi PATCH se update hoti hai —
 *   admin kuch bhi apne paas duplicate nahi rakhta, isliye do panel kabhi out of sync nahi.
 * - Local dev me `.data/orders.json` (storefront aur admin same repo me).
 */
const STORE_API = (process.env.STORE_API_URL ?? "").replace(/\/$/, "");
const API_TOKEN = process.env.ADMIN_API_TOKEN ?? "";
const remoteMode = () => Boolean(STORE_API && API_TOKEN);

async function storeRequest<T>(pathName: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${STORE_API}${pathName}`, {
      ...init,
      headers: {
        authorization: `Bearer ${API_TOKEN}`,
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getOrders(): Promise<Order[]> {
  if (remoteMode()) {
    const payload = await storeRequest<{ orders: Order[] }>("/api/admin/orders");
    return payload?.orders ?? [];
  }
  return readRows<Order>("orders.json");
}

export async function getOrder(orderNumber: string): Promise<Order | undefined> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
    return payload?.order;
  }
  const rows = readRows<Order>("orders.json");
  return rows.find((order) => order.orderNumber === orderNumber);
}

export async function updateOrderStatus(
  orderNumber: string,
  status: Order["status"],
  actor: string,
  note?: string,
): Promise<Order | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "status", status, actor, note }),
    });
    return payload?.order ?? null;
  }

  const rows = readRows<Order>("orders.json");
  const index = rows.findIndex((order) => order.orderNumber === orderNumber);
  if (index === -1) return null;
  const current = rows[index]!;
  // status machine ek hi jagah define hai (packages/validation)
  if (!canTransition(current.status, status)) return null;
  rows[index] = {
    ...current,
    status,
    audit: [
      { at: new Date().toISOString(), actor, action: `order.status.${status}`, meta: note ? { note } : undefined },
      ...current.audit,
    ],
  };
  writeRows("orders.json", rows);
  return rows[index]!;
}

/** courier + AWB admin panel se set hote hain; customer track page yahi dikhata hai */
/** Admin ka "abhi kahan atka hai" note — customer tracking page par dikhta hai. */
export async function setOrderNote(orderNumber: string, text: string, actor: string): Promise<Order | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "note", text, actor }),
    });
    return payload?.order ?? null;
  }

  const rows = readRows<Order>("orders.json");
  const index = rows.findIndex((order) => order.orderNumber === orderNumber);
  if (index === -1) return null;
  const current = rows[index]!;
  const now = new Date().toISOString();
  const clean = String(text ?? "").trim().slice(0, 240);
  rows[index] = {
    ...current,
    statusNote: clean ? { text: clean, at: now, by: actor, status: current.status } : null,
    audit: [
      { at: now, actor, action: clean ? "order.note_updated" : "order.note_cleared", meta: clean ? { text: clean } : undefined },
      ...current.audit,
    ],
  };
  writeRows("orders.json", rows);
  return rows[index]!;
}

/**
 * Customer ki contact details admin se theek karna (galat phone/pincode,
 * customer ka call par address change). Storefront hi source of truth hai,
 * isliye remote mode me PATCH se jaata hai.
 */
export async function updateOrderContact(
  orderNumber: string,
  input: {
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  },
  actor: string,
): Promise<Order | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "contact", ...input, actor }),
    });
    return payload?.order ?? null;
  }

  const rows = readRows<Order>("orders.json");
  const index = rows.findIndex((order) => order.orderNumber === orderNumber);
  if (index === -1) return null;
  const current = rows[index]!;
  const now = new Date().toISOString();
  const clean = (value: string | undefined, fallback: string) =>
    value === undefined ? fallback : String(value).replace(/\s+/g, " ").trim() || fallback;
  rows[index] = {
    ...current,
    customerName: clean(input.customerName, current.customerName),
    email: clean(input.email, current.email),
    phone: clean(input.phone, current.phone).replace(/\D/g, "").slice(-10) || current.phone,
    address: clean(input.address, current.address),
    city: clean(input.city, current.city),
    state: clean(input.state, current.state),
    pincode: /^[1-9]\d{5}$/.test(String(input.pincode ?? "")) ? String(input.pincode) : current.pincode,
    audit: [
      { at: now, actor, action: "order.contact_updated", meta: { via: "admin-panel" } },
      ...current.audit,
    ],
  };
  writeRows("orders.json", rows);
  return rows[index]!;
}

export async function setOrderTracking(
  orderNumber: string,
  input: { courier?: string; awb?: string; url?: string },
  actor: string,
): Promise<Order | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "tracking", ...input, actor }),
    });
    return payload?.order ?? null;
  }

  const rows = readRows<Order>("orders.json");
  const index = rows.findIndex((order) => order.orderNumber === orderNumber);
  if (index === -1) return null;
  const current = rows[index]!;
  const now = new Date().toISOString();
  const tracking = {
    courier: input.courier?.trim() || null,
    awb: input.awb?.trim() || null,
    url: input.url?.trim() || null,
    shippedAt: current.tracking?.shippedAt ?? (input.courier || input.awb ? now : null),
    deliveredAt: current.tracking?.deliveredAt ?? (current.status === "delivered" ? now : null),
    updatedAt: now,
    updatedBy: actor,
  };
  rows[index] = {
    ...current,
    tracking,
    audit: [
      { at: now, actor, action: "order.tracking_updated", meta: { courier: tracking.courier, awb: tracking.awb } },
      ...current.audit,
    ],
  };
  writeRows("orders.json", rows);
  return rows[index]!;
}

/* ───────────────────── delivery (pincode) rules ─────────────────────
 * Source of truth storefront hai: remote mode me API, warna local `.data/`. */

export type DeliverySettingsPayload = DeliverySettings;
export type DeliveryAdminData = {
  settings: DeliverySettings;
  states: { state: string; pincodes: number; districts: number }[];
  totals: { pincodes: number; states: number };
};

const DELIVERY_FILE = "delivery.json";

const DEFAULT_DELIVERY: DeliverySettings = {
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
  allowAllStates: true,
  states: {},
  blockedPincodes: [],
  allowedPincodes: [],
  deliveryDays: "4-7 business days",
  freeShipping: true,
};

export async function getDelivery(): Promise<DeliveryAdminData> {
  if (remoteMode()) {
    const payload = await storeRequest<DeliveryAdminData>("/api/admin/delivery");
    if (payload) return payload;
  }
  // local fallback: sirf tab jab admin akela chal raha ho
  const file = dataFile(DELIVERY_FILE);
  let settings = DEFAULT_DELIVERY;
  if (fs.existsSync(file)) {
    try {
      settings = { ...DEFAULT_DELIVERY, ...(JSON.parse(fs.readFileSync(file, "utf8")) as DeliverySettings) };
    } catch {
      settings = DEFAULT_DELIVERY;
    }
  }
  return {
    settings,
    states: [],
    totals: { pincodes: 0, states: 0 },
  };
}

export async function saveDelivery(settings: DeliverySettings, actor: string): Promise<DeliverySettings | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ data: DeliverySettings }>("/api/admin/delivery", {
      method: "PUT",
      body: JSON.stringify({ settings, actor }),
    });
    return payload?.data ?? null;
  }
  const next: DeliverySettings = { ...settings, updatedAt: new Date().toISOString(), updatedBy: actor };
  const file = dataFile(DELIVERY_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
  return next;
}

export type StoreSettings = {
  announcement: string;
  freeShipping: boolean;
  upiId: string;
  upiName: string;
  /** GST invoice ka seller block — customer ko website par nahi dikhta */
  gstin: string;
  sellerName: string;
  sellerAddress: string;
  sellerState: string;
  supportPhone: string;
  supportEmail: string;
  whatsapp: string;
  /** admin panel ka link — sheet ke Settings tab se (customer ko nahi dikhta) */
  adminUrl: string;
};

const DEFAULT_SETTINGS: StoreSettings = {
  announcement: "Diwali Sale — Up to 70% OFF · Final price ₹499 onwards",
  freeShipping: true,
  /* R38: UPI ka source sheet/admin settings hain — koi hardcoded payee nahi. */
  upiId: "",
  upiName: "Noor Ethnic Wear",
  // GSTIN khaali — owner apna asli number Settings me daalega (fake number kabhi nahi)
  gstin: "",
  sellerName: "Noor Ethnic Wear",
  sellerAddress: "",
  sellerState: "Rajasthan",
  supportPhone: "",
  supportEmail: "info.noorethnicwear@gmail.com",
  whatsapp: "",
  adminUrl: process.env.ADMIN_PANEL_URL ?? "",
};

export type ManualOrderInput = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
  items: { handle: string; size: string; quantity: number }[];
  markPaid?: boolean;
  reference?: string;
  actor?: string;
};

/** Admin ke manual (phone/WhatsApp) order — storefront hi order number banata hai. */
export async function createAdminOrder(
  input: ManualOrderInput,
): Promise<{ order?: { orderNumber: string; total: number }; error?: string }> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order?: { orderNumber: string; total: number }; error?: string }>(
      "/api/admin/orders",
      { method: "POST", body: JSON.stringify(input) },
    );
    if (payload) return payload;
    return { error: "Storefront API se reply nahi aaya (STORE_API_URL / ADMIN_API_TOKEN check kariye)." };
  }
  return { error: "Manual order ke liye STORE_API_URL set kariye (admin ko storefront chahiye)." };
}

export type SheetOverview = {
  configured: boolean;
  reachable?: boolean;
  settings?: Partial<StoreSettings>;
  live?: Partial<StoreSettings>;
  /** settings read path ka sach — sheet se aayi ya defaults se, kitni purani, kya error */
  liveRead?: {
    configured?: boolean;
    source?: "apps-script" | "csv" | null;
    ageMs?: number | null;
    stale?: boolean;
    lastReadMs?: number;
    lastError?: string | null;
    ttlMs?: number;
    readTimeoutMs?: number;
    upiId?: string | null;
  };
  sheet?: string | null;
  hint?: string;
  recent?: {
    orders: Record<string, string | number>[];
    payments: Record<string, string | number>[];
    messages: Record<string, string | number>[];
  };
  /** Apps Script ka live status (kaun si book pakdi hai) */
  health?: {
    ok?: boolean;
    spreadsheet?: string | null;
    spreadsheetId?: string | null;
    spreadsheetUrl?: string | null;
    rows?: Record<string, number>;
    error?: string;
  } | null;
  expectedSheetId?: string;
  sheetMismatch?: boolean;
};

/** Admin ka "Google Sheet" screen — storefront API se live sheet data. */
export async function getSheetOverview(): Promise<SheetOverview> {
  if (remoteMode()) {
    /**
     * `health` / `expectedSheetId` / `sheetMismatch` storefront se aate hain —
     * sheet page isse "script doosri sheet me likh raha hai" warning dikhata hai.
     */
    const payload = await storeRequest<SheetOverview>("/api/admin/sheet");
    if (payload) return payload;
  }
  return {
    configured: Boolean(process.env.GOOGLE_SHEETS_WEBAPP_URL),
    settings: await getSettings(),
    recent: { orders: [], payments: [], messages: [] },
    hint: "Local/dev me sheet rows sirf storefront ke through aati hain (STORE_API_URL set kariye).",
  };
}

export async function getSettings(): Promise<StoreSettings> {
  if (remoteMode()) {
    const payload = await storeRequest<{ data: Partial<StoreSettings> }>("/api/admin/settings");
    if (payload?.data) return { ...DEFAULT_SETTINGS, ...payload.data };
  }
  const file = dataFile("settings.json");
  if (!fs.existsSync(file)) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(fs.readFileSync(file, "utf8")) as StoreSettings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: StoreSettings, actor = "admin"): Promise<StoreSettings> {
  if (remoteMode()) {
    const payload = await storeRequest<{ data: StoreSettings }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings, actor }),
    });
    if (payload?.data) return payload.data;
  }
  return saveSettingsLocal(settings);
}

function saveSettingsLocal(settings: StoreSettings): StoreSettings {
  const file = dataFile("settings.json");
  fs.writeFileSync(file, JSON.stringify(settings, null, 2));
  return settings;
}

export type AuditRow = { at: string; actor: string; action: string; target: string; meta?: unknown };

export function appendAudit(row: Omit<AuditRow, "at">) {
  const rows = readRows<AuditRow>("admin-audit.json");
  rows.unshift({ at: new Date().toISOString(), ...row });
  writeRows("admin-audit.json", rows.slice(0, 500));
}

/** local snapshot — sirf tab kaam ka jab admin storefront ke saath hi chal raha ho */
export function getOrdersSync(): Order[] {
  return readRows<Order>("orders.json");
}

/** audit feed — remote mode me orders storefront API se aate hain */
export async function getAudit(limit = 100): Promise<AuditRow[]> {
  const rows = readRows<AuditRow>("admin-audit.json");
  // remote mode me orders ka lifecycle audit storefront se aata hai (admin ke paas copy nahi)
  const orders = remoteMode() ? await getOrders() : getOrdersSync();
  const orderAudit = orders.flatMap((order) =>
    order.audit.map((entry) => ({
      at: entry.at,
      actor: entry.actor,
      action: entry.action,
      target: order.orderNumber,
      meta: entry.meta,
    })),
  );
  return [...orderAudit, ...rows].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

export type ContactMessage = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  handled: boolean;
  handledAt?: string | null;
  handledBy?: string | null;
  replied: boolean;
  repliedAt?: string | null;
  repliedBy?: string | null;
};

/** Checkout funnel — owner ko dikhta hai kaun checkout tak pahuncha / fail hua */
export type CheckoutEventRow = {
  id: string;
  createdAt: string;
  event: string;
  step?: string | null;
  orderNumber?: string | null;
  itemsCount: number;
  subtotal: number;
  reason?: string | null;
  phone?: string | null;
};

export type CheckoutFunnel = Record<string, number>;

export async function getCheckoutEvents(
  limit = 50,
): Promise<{ events: CheckoutEventRow[]; funnel: CheckoutFunnel }> {
  const empty: CheckoutFunnel = {
    "checkout.started": 0,
    "checkout.review": 0,
    "order.placed": 0,
    "order.failed": 0,
  };
  if (remoteMode()) {
    const payload = await storeRequest<{ events: CheckoutEventRow[]; funnel: CheckoutFunnel }>(
      `/api/admin/checkout-events?limit=${limit}`,
    );
    if (payload?.events) return { events: payload.events, funnel: payload.funnel ?? empty };
  }
  return { events: [], funnel: empty };
}

/**
 * Website ke contact-form messages.
 * Remote mode me storefront API (Postgres) se — pehle admin apni local file
 * padhta tha jahan kabhi kuch aata hi nahi tha.
 */
/**
 * Site traffic (owner ask: "pure traffic ka pata chale").
 * Remote mode me storefront ke apne counter se (`/api/admin/traffic`);
 * local me `.data/traffic.json` se — dono jagah same shape.
 */
export type TrafficSummary = {
  today: number;
  yesterday: number;
  last7: number;
  visitorsToday: number;
  visitors7: number;
  days: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number }[];
  referrers: { referrer: string; views: number }[];
  source: "db" | "file";
};

const EMPTY_TRAFFIC: TrafficSummary = {
  today: 0,
  yesterday: 0,
  last7: 0,
  visitorsToday: 0,
  visitors7: 0,
  days: [],
  pages: [],
  referrers: [],
  source: "file",
};

export async function getTraffic(): Promise<TrafficSummary> {
  if (remoteMode()) {
    const payload = await storeRequest<TrafficSummary>("/api/admin/traffic");
    if (payload && Array.isArray(payload.days)) return payload;
    return EMPTY_TRAFFIC;
  }
  const store = readRows<{ key: string; views: number; referrer: string }>("traffic.json");
  const byDay = new Map<string, number>();
  const byPage = new Map<string, number>();
  const byRef = new Map<string, number>();
  for (const row of store) {
    const [day = "", path = ""] = String(row.key ?? "").split("|");
    byDay.set(day, (byDay.get(day) ?? 0) + (row.views ?? 0));
    byPage.set(path, (byPage.get(path) ?? 0) + (row.views ?? 0));
    byRef.set(row.referrer ?? "direct", (byRef.get(row.referrer ?? "direct") ?? 0) + (row.views ?? 0));
  }
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([day, views]) => ({ day, views, visitors: 0 }));
  return {
    ...EMPTY_TRAFFIC,
    today: days[days.length - 1]?.views ?? 0,
    yesterday: days[days.length - 2]?.views ?? 0,
    last7: days.reduce((sum, row) => sum + row.views, 0),
    days,
    pages: [...byPage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([path, views]) => ({ path, views })),
    referrers: [...byRef.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([referrer, views]) => ({ referrer, views })),
  };
}

export async function getMessages(limit = 100): Promise<ContactMessage[]> {
  if (remoteMode()) {
    const payload = await storeRequest<{ messages: ContactMessage[] }>(`/api/admin/messages?limit=${limit}`);
    if (payload?.messages) return payload.messages;
  }
  return readRows<ContactMessage>("messages.json").slice(0, limit);
}

/** Admin ne jawab bheja / undo — storefront API par (dono mode me same behaviour) */
export async function setMessageReplied(id: string, replied: boolean, actor: string): Promise<boolean> {
  if (remoteMode()) {
    const payload = await storeRequest<{ message: ContactMessage }>("/api/admin/messages", {
      method: "PATCH",
      body: JSON.stringify({ id, action: replied ? "replied" : "unreplied", actor }),
    });
    if (payload?.message) return true;
  }
  const rows = readRows<ContactMessage>("messages.json");
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return false;
  rows[index] = {
    ...rows[index]!,
    replied,
    repliedAt: replied ? new Date().toISOString() : null,
    repliedBy: replied ? actor : null,
    handled: replied ? true : rows[index]!.handled,
  };
  writeRows("messages.json", rows);
  return true;
}

export async function markMessageHandled(id: string, actor: string): Promise<boolean> {
  if (remoteMode()) {
    const payload = await storeRequest<{ message: ContactMessage }>("/api/admin/messages", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "handled", actor }),
    });
    if (payload?.message) return true;
  }
  const rows = readRows<ContactMessage>("messages.json");
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return false;
  rows[index] = { ...rows[index]!, handled: true, handledAt: new Date().toISOString(), handledBy: actor };
  writeRows("messages.json", rows);
  return true;
}

/* ───────────────────────── manual invoice (admin) ─────────────────────────
 * Owner apne hi store ke naam par invoice bana ke WhatsApp par bhej sakta hai
 * (kisi aur ke naam/address par bhi). Ye invoice series alag rehti hai taaki
 * real orders ki GST numbering se clash na ho. */

export type ManualInvoiceItem = ManualInvoiceItemType;

export type ManualInvoice = ManualInvoiceType;

/** Admin ke manual invoices — storefront API (Postgres) par, warna local JSON. */
export async function getManualInvoices(): Promise<ManualInvoice[]> {
  if (remoteMode()) {
    const payload = await storeRequest<{ invoices: ManualInvoice[] }>("/api/admin/invoices");
    if (payload?.invoices) return payload.invoices;
  }
  return readRows<ManualInvoice>("manual-invoices.json");
}

export async function getManualInvoice(number: string): Promise<ManualInvoice | undefined> {
  if (remoteMode()) {
    const payload = await storeRequest<{ invoice: ManualInvoice }>(`/api/admin/invoices/${encodeURIComponent(number)}`);
    if (payload?.invoice) return payload.invoice;
  }
  return (await getManualInvoices()).find((invoice) => invoice.number === number);
}

export async function createManualInvoice(
  input: Omit<ManualInvoice, "number" | "createdAt" | "subtotal" | "total">,
): Promise<ManualInvoice> {
  if (remoteMode()) {
    const payload = await storeRequest<{ invoice: ManualInvoice }>("/api/admin/invoices", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (payload?.invoice) return payload.invoice;
  }
  const rows = await getManualInvoices();
  const sequence = rows.reduce((max, row) => {
    const value = Number(row.number.split("/").pop());
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const createdAt = new Date().toISOString();
  const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const invoice: ManualInvoice = {
    ...input,
    number: `LK/MANUAL/${String(sequence + 1).padStart(4, "0")}`,
    createdAt,
    subtotal,
    total: subtotal,
  };
  const local = readRows<ManualInvoice>("manual-invoices.json");
  local.unshift(invoice);
  writeRows("manual-invoices.json", local);
  return invoice;
}

/* ───────────────────────── payment verification (admin) ───────────────────────── */

/** Manual UPI / bank transfer admin verify karta hai — tab order confirm hota hai. */
export async function verifyOrderPayment(
  orderNumber: string,
  input: { reference: string; amount: number; actor: string; note?: string },
): Promise<Order | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "payment", ...input }),
    });
    return payload?.order ?? null;
  }

  const rows = readRows<Order>("orders.json");
  const index = rows.findIndex((order) => order.orderNumber === orderNumber);
  if (index === -1) return null;
  const current = rows[index]!;
  if (current.paymentStatus === "paid") return current;
  const now = new Date().toISOString();
  const nextStatus = current.status === "placed" && canTransition("placed", "confirmed") ? "confirmed" : current.status;
  rows[index] = {
    ...current,
    paymentStatus: "paid",
    status: nextStatus,
    payment: {
      gateway: current.payment?.gateway ?? "manual-upi",
      reference: input.reference,
      upiUri: current.payment?.upiUri ?? null,
      amount: input.amount,
      status: "paid",
      createdAt: current.payment?.createdAt ?? now,
      verifiedAt: now,
      verifiedBy: input.actor,
      failureReason: null,
    },
    audit: [
      {
        at: now,
        actor: input.actor,
        action: "payment.verified.manual",
        meta: { reference: input.reference, amount: input.amount, note: input.note },
      },
      ...(nextStatus !== current.status
        ? [{ at: now, actor: input.actor, action: "order.status.confirmed", meta: { reason: "payment verified" } }]
        : []),
      ...current.audit,
    ],
  };
  writeRows("orders.json", rows);
  return rows[index]!;
}

/**
 * Auto-confirm undo — owner bank me credit na dekhe to payment wapas pending.
 * Remote mode me storefront API (`action: "payment_reverse"`) chalta hai.
 */
export async function reverseOrderPayment(
  orderNumber: string,
  input: { actor: string; reason: string },
): Promise<Order | null> {
  if (remoteMode()) {
    const payload = await storeRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "payment_reverse", ...input }),
    });
    return payload?.order ?? null;
  }

  const rows = readRows<Order>("orders.json");
  const index = rows.findIndex((order) => order.orderNumber === orderNumber);
  if (index === -1) return null;
  const current = rows[index]!;
  if (current.paymentStatus !== "paid") return current;
  const now = new Date().toISOString();
  const reason = input.reason.trim().slice(0, 200) || "payment not received";
  rows[index] = {
    ...current,
    paymentStatus: "pending",
    status: current.status === "confirmed" ? "placed" : current.status,
    payment: {
      gateway: current.payment?.gateway ?? "upi-return",
      reference: current.payment?.reference ?? null,
      upiUri: current.payment?.upiUri ?? null,
      amount: current.payment?.amount ?? current.total,
      status: "pending",
      createdAt: current.payment?.createdAt ?? now,
      verifiedAt: null,
      verifiedBy: null,
      failureReason: reason,
    },
    audit: [
      { at: now, actor: input.actor, action: "payment.reversed", meta: { reason } },
      ...current.audit,
    ],
  };
  writeRows("orders.json", rows);
  return rows[index]!;
}

export async function pendingPayments() {
  const orders = await getOrders();
  return orders.filter((order) => order.paymentStatus !== "paid" && order.paymentStatus !== "cod");
}
