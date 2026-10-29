/**
 * Order → Google Sheet, **seedha browser se** (R50b).
 *
 * GitHub Pages par koi Node server nahi hota, isliye wahan `/api/orders` jaisa
 * kuch nahi chalta — isi wajah se order Sheet me nahi pahunch raha tha. Ab
 * checkout khud Apps Script web app par `place_order` bhejta hai, jo Orders +
 * Order Items tabs me row likh deta hai.
 *
 * Kyun `text/plain`? Apps Script POST par CORS preflight nahi karta; `text/plain`
 * "simple request" hoti hai, isliye browser preflight bhejta hi nahi aur
 * googleusercontent ka `Access-Control-Allow-Origin: *` jawab padha ja sakta hai.
 * Body JSON hi hai — server `JSON.parse` karta hai.
 *
 * URL `NEXT_PUBLIC_SHEETS_WEBAPP_URL` se aata hai (build me inline hota hai).
 * Set na ho to order sirf WhatsApp se jaata hai (customer ke liye kuch nahi
 * badalta), bas Sheet me row nahi banti.
 */
export const SHEETS_WEBAPP_URL = (process.env.NEXT_PUBLIC_SHEETS_WEBAPP_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/** Sheet me order likhna possible hai ya nahi */
export const SHEET_ORDER_ENABLED = /^https:\/\/script\.google\.com\//.test(SHEETS_WEBAPP_URL);

export type SheetOrderItem = {
  handle?: string;
  title: string;
  size?: string;
  colour?: string;
  quantity: number;
  price: number;
  category?: string;
  image?: string;
};

export type SheetOrderCustomer = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
};

export type SheetOrderResult = {
  ok: boolean;
  orderNumber: string | null;
  total?: number;
  error?: string;
  code?: string;
  /** same clientId ka order pehle hi likha hua tha — duplicate nahi bana */
  duplicate?: boolean;
};

/** Ek clientId — double click / retry par ek hi order bane */
export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Order Sheet me likho. Kabhi throw nahi karta — fail ho to `ok:false` deta hai
 * taaki checkout ruk na jaye (order WhatsApp se phir bhi jaata hai).
 */
export async function placeOrderInSheet(input: {
  clientId?: string;
  items: SheetOrderItem[];
  customer: SheetOrderCustomer;
  device?: string;
  timeoutMs?: number;
}): Promise<SheetOrderResult> {
  if (!SHEET_ORDER_ENABLED) {
    return { ok: false, orderNumber: null, error: "sheet web app URL not set", code: "not_configured" };
  }
  if (!input.items?.length) {
    return { ok: false, orderNumber: null, error: "bag is empty", code: "no_items" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 25_000);
  try {
    const response = await fetch(SHEETS_WEBAPP_URL, {
      method: "POST",
      // preflight-free request — Apps Script CORS ke liye zaroori
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      signal: controller.signal,
      body: JSON.stringify({
        action: "place_order",
        order: {
          clientId: input.clientId ?? newClientId(),
          items: input.items,
          customer: input.customer,
          device: input.device ?? (typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : ""),
        },
      }),
    });
    if (!response.ok) {
      return { ok: false, orderNumber: null, error: `sheet HTTP ${response.status}`, code: "http" };
    }
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { ok: false, orderNumber: null, error: "sheet ne JSON nahi diya", code: "parse" };
    }
    if (data.ok === true && typeof data.orderNumber === "string" && data.orderNumber.trim()) {
      return {
        ok: true,
        orderNumber: data.orderNumber.trim(),
        total: typeof data.total === "number" ? data.total : undefined,
        duplicate: data.duplicate === true,
      };
    }
    return {
      ok: false,
      orderNumber: null,
      error: typeof data.error === "string" ? data.error : "order save nahi hua",
      code: typeof data.code === "string" ? data.code : "rejected",
    };
  } catch (problem) {
    const aborted = (problem as Error)?.name === "AbortError";
    return {
      ok: false,
      orderNumber: null,
      error: aborted ? "sheet timeout" : String((problem as Error)?.message ?? problem),
      code: aborted ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}
