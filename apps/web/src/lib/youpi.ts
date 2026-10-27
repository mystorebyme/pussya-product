import "server-only";

import fs from "@/lib/fs-runtime";
import { dataFile } from "@/lib/data-dir";
import { getStoreSettings, type StoreSettings } from "@/lib/store-settings";

/**
 * YouPI PG — UPI payment gateway integration (server side).
 *
 * Contract source: https://github.com/youpi-pg/YouPI-PG (`openapi.yaml` + README).
 *
 *   • `POST {payUrl}/api/v1/payments` — header `X-Merchant-Id`, body
 *     `{ orderId, amount, currency, customer, description, returnUrl, metadata }`
 *     → `{ paymentId, orderId, amount, amountPaise, currency, status, checkoutUrl }`.
 *   • `GET  {payUrl}/api/v1/payments/{paymentId}` — asli status (`SUCCESS`),
 *     `amountPaise`, `utr`, `verificationLevel`.
 *   • Webhook — `X-Gateway-Signature: sha256=HMAC-SHA256(secret, rawBody)` aur
 *     `X-Gateway-Signature-V2: HMAC(secret, "<timestamp_ms>.<rawBody>")`,
 *     dedupe `X-Gateway-Delivery-Id`.
 *
 * Owner rule (R38/R40/R48): **client par kabhi bharosa nahi**. Browser ka
 * `handler(res)` sirf UI ke liye hai; order tabhi confirm hota hai jab server
 * gateway API se payment dobara fetch karke amount match kare (ya HMAC-verified
 * webhook aaye).
 *
 * Config **sheet se live** aati hai (`youpi_pay_url`, `youpi_merchant_id`,
 * `youpi_enabled`, `youpi_webhook_secret`) — redeploy ki zaroorat nahi. Env
 * (`YOUPI_*`) sirf fallback hai, aur static GitHub Pages par build-time
 * `NEXT_PUBLIC_YOUPI_*` public values.
 */

export type YoupiConfig = {
  /** gateway origin, e.g. `https://pay.noorethnicwear.in` (browser isi par jaata hai) */
  payUrl: string;
  /**
   * Server-to-server calls ke liye alag origin (optional). Jab gateway public
   * internet se na khulta ho (ya internal network me ho) to `YOUPI_PAY_URL_INTERNAL`
   * set karein — server wahan baat karega, browser public `payUrl` par.
   */
  internalUrl: string;
  /**
   * Publishable Merchant ID (`data-youpi-key` / `X-Merchant-Id`) — public key.
   * Merchant admin → Settings → "Merchant API Keys" card se copy hota hai.
   */
  merchantId: string;
  /**
   * Secret Merchant API Key (`mk_live_…`, header `X-Merchant-Key`) — **sirf
   * server**. Gateway iske bina non-default merchant ke liye session nahi
   * banata (`401 MISSING_MERCHANT_KEY`), aur iske bina status ka private view
   * (metadata/verification) nahi milta.
   */
  merchantKey: string;
  /** sirf server par — browser ko kabhi nahi jaata */
  webhookSecret: string;
  currency: string;
  /** kaunsi value kahan se aayi (diagnostics ke liye) */
  source: "sheet" | "env" | "mixed";
};

/**
 * `https://pay.x.com/` → `https://pay.x.com`; galat/khali → "".
 *
 * Same-origin path (`/pay`) bhi chalta hai — tab gateway site ke reverse proxy
 * ke peeche hota hai (ya local demo). Aisa path jaisa hai waisa hi rakha jaata
 * hai, browser usi origin par call karega.
 */
export function normalisePayUrl(raw?: string | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value.replace(/\/+$/, "") || "/";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
}

function envConfig(): Partial<YoupiConfig> {
  return {
    payUrl: normalisePayUrl(process.env.YOUPI_PAY_URL),
    internalUrl: normalisePayUrl(process.env.YOUPI_PAY_URL_INTERNAL),
    merchantId: (process.env.YOUPI_MERCHANT_ID ?? "").trim(),
    merchantKey: (process.env.YOUPI_MERCHANT_KEY ?? "").trim(),
    webhookSecret: (process.env.YOUPI_WEBHOOK_SECRET ?? "").trim(),
  };
}

/** Env se milne wala public config (sheet/DB load nahi) */
export function youpiEnvConfig(): { payUrl: string; merchantId: string } {
  const env = envConfig();
  return { payUrl: env.payUrl ?? "", merchantId: env.merchantId ?? "" };
}

/** Sheet/DB settings + env ko jod kar final config. Enabled + URL + key hone par hi. */
export function resolveYoupiConfig(settings?: Partial<StoreSettings> | null): YoupiConfig | null {
  if (settings && settings.youpiEnabled === false) return null;
  const env = envConfig();
  const sheetUrl = normalisePayUrl(settings?.youpiPayUrl);
  const sheetKey = (settings?.youpiMerchantId ?? "").trim();
  const sheetMerchantKey = (settings?.youpiMerchantKey ?? "").trim();
  const sheetSecret = (settings?.youpiWebhookSecret ?? "").trim();

  const payUrl = sheetUrl || env.payUrl || "";
  const merchantId = sheetKey || env.merchantId || "";
  const merchantKey = sheetMerchantKey || env.merchantKey || "";
  const webhookSecret = sheetSecret || env.webhookSecret || "";

  if (!payUrl || !merchantId) return null;

  const source: YoupiConfig["source"] =
    sheetUrl && sheetKey ? (sheetSecret || env.webhookSecret ? "mixed" : "sheet") : "env";
  return {
    payUrl,
    internalUrl: env.internalUrl || payUrl,
    merchantId,
    merchantKey,
    webhookSecret,
    currency: "INR",
    source,
  };
}

/** Runtime config (sheet se live — `getStoreSettings` cached hai, payment page `fresh` bhejta hai) */
export async function youpiConfig(): Promise<YoupiConfig | null> {
  try {
    const settings = await getStoreSettings();
    return resolveYoupiConfig(settings);
  } catch {
    return resolveYoupiConfig(null);
  }
}

/* ───────────────────────────── gateway calls ───────────────────────────── */

export type YoupiSession = {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: number;
  currency: string;
  status: string;
  checkoutUrl: string;
};

export class YoupiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code?: string,
    /** 409 DUPLICATE_SESSION_DETECTED par gateway ka purana session id */
    readonly sessionId?: string,
  ) {
    super(message);
    this.name = "YoupiError";
  }
}

async function gatewayFetch(
  config: YoupiConfig,
  pathName: string,
  init: RequestInit = {},
): Promise<Response> {
  // server-to-server: internal origin (agar diya ho) warna public hi
  const origin = config.internalUrl || config.payUrl;
  return fetch(`${origin}${pathName}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-merchant-id": config.merchantId,
      // Secret key: non-default merchant ka session + status ka private view
      ...(config.merchantKey ? { "x-merchant-key": config.merchantKey } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
}

/**
 * Gateway par payment session banao. `idempotencyKey` same hona chahiye agar
 * customer dobara try kare — YouPI duplicate session par `409
 * DUPLICATE_SESSION_DETECTED` deta hai (usme purani `checkoutUrl` hoti hai).
 */
export async function createYoupiPayment(
  input: {
    orderId: string;
    amountPaise: number;
    description?: string;
    customer?: { name?: string; email?: string; phone?: string };
    returnUrl?: string;
    metadata?: Record<string, string>;
  },
  config: YoupiConfig,
  idempotencyKey?: string,
): Promise<YoupiSession> {
  const body = {
    orderId: input.orderId,
    // YouPI rupees leta hai (string), paise nahi
    amount: (Math.round(input.amountPaise) / 100).toFixed(2),
    currency: config.currency,
    customer: input.customer,
    description: input.description ?? `Noor Ethnic Wear order ${input.orderId}`,
    returnUrl: input.returnUrl,
    metadata: input.metadata,
  };

  const response = await gatewayFetch(config, "/api/v1/payments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {},
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<YoupiSession> & {
    error?: string;
    code?: string;
    message?: string;
    /** DuplicateSessionResponse (409) me purana session */
    session_id?: string;
  };

  if (!response.ok || !payload.paymentId) {
    throw new YoupiError(
      payload.error ?? payload.message ?? `Gateway ne session nahi banaya (HTTP ${response.status})`,
      response.status === 409 ? 409 : 502,
      payload.code,
      payload.session_id,
    );
  }

  return {
    paymentId: payload.paymentId,
    orderId: payload.orderId ?? input.orderId,
    amount: String(payload.amount ?? body.amount),
    amountPaise: Number(payload.amountPaise ?? input.amountPaise),
    currency: payload.currency ?? config.currency,
    status: payload.status ?? "PENDING",
    checkoutUrl: payload.checkoutUrl ?? `${config.payUrl}/checkout/${payload.paymentId}`,
  };
}

export type YoupiPayment = {
  paymentId: string;
  orderId: string;
  status: string;
  amountPaise: number;
  utr: string | null;
  verificationLevel: number;
  completedAt: string | null;
};

/** Server-to-server status — **authoritative** (client ke callback par nahi) */
export async function fetchYoupiPayment(
  paymentId: string,
  config: YoupiConfig,
): Promise<YoupiPayment | null> {
  try {
    const response = await gatewayFetch(config, `/api/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const rupees = Number(payload.amount ?? 0);
    const amountPaise = Number(payload.amountPaise ?? Math.round(rupees * 100));
    return {
      paymentId: String(payload.paymentId ?? payload.id ?? paymentId),
      orderId: String(payload.orderId ?? ""),
      status: String(payload.status ?? "").toUpperCase(),
      amountPaise,
      utr: payload.utr ? String(payload.utr) : null,
      verificationLevel: Number(payload.verificationLevel ?? 0),
      completedAt: payload.completedAt ? String(payload.completedAt) : null,
    };
  } catch {
    return null;
  }
}

/* ─────────────────────────────── webhook ─────────────────────────────── */

/*
 * Signature/amount helpers `lib/youpi-signature.ts` me hain (pure module) —
 * wahi code webhook route aur unit tests use karte hain.
 */
export {
  verifyYoupiSignature,
  verifyYoupiSignatureV2,
  verifyYoupiWebhook,
  youpiAmountMatches,
} from "./youpi-signature";

/**
 * Webhook delivery-id dedupe (YouPI 1 ghante tak byte-for-byte retry karta hai).
 * File chhoti rehti hai — sirf last 500 delivery ids.
 */
export function seenYoupiDelivery(deliveryId: string): boolean {
  if (!deliveryId) return false;
  const file = dataFile("youpi-deliveries.json");
  let list: string[] = [];
  try {
    if (fs.existsSync(file)) list = JSON.parse(fs.readFileSync(file, "utf8")) as string[];
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  if (list.includes(deliveryId)) return true;
  list.push(deliveryId);
  try {
    fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(list.slice(-500)));
    fs.renameSync(`${file}.tmp`, file);
  } catch {
    // dedupe best-effort hai — asli safety server-to-server verify hai
  }
  return false;
}
