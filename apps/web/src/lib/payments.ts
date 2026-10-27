import "server-only";

import crypto from "node:crypto";
import fs from "@/lib/fs-runtime";
import path from "node:path";
import { dataFile } from "@/lib/data-dir";
import { siteConfig } from "@/config/site";

/**
 * Payments — sirf backend decide karta hai ki paisa aaya ya nahi.
 *
 * Flow (koi bhi client-side "success" flag par bharosa nahi):
 *   1. Order banne par `paymentStatus: "pending"` rehta hai.
 *   2. `createIntent()` gateway se server-side order banata hai (ya manual UPI QR deta hai).
 *   3. Gateway webhook aata hai -> HMAC signature verify + gateway API se dobara confirm.
 *   4. Tab `markPaid()` order ko "confirmed" karta hai. Warna order pending hi rehta hai.
 *
 * Gateway accounts: env me 3 tak accounts de sakte hain (RAZORPAY_KEY_ID_1..3).
 * Ek account block/fail ho jaye to agla account automatic use hota hai — customer ko
 * kuch pata nahi chalta. Health file `.data/payment-gateway-health.json` me rehti hai.
 */

export type GatewayAccount = {
  id: string;
  provider: "razorpay";
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

export type PaymentIntentResult = {
  mode: "gateway" | "manual-upi";
  gateway: string;
  reference: string | null;
  amount: number;
  /** UPI intent / QR string (customer ko dikhta hai) */
  upiUri: string | null;
  /** gateway checkout ke liye public key (secret kabhi nahi) */
  publicKey?: string | null;
  expiresAt: string;
};

type Health = Record<string, { failures: number; blockedUntil: number | null; lastError?: string }>;

const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;

function healthFile() {
  return dataFile("payment-gateway-health.json");
}

function readHealth(): Health {
  const file = healthFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Health;
  } catch {
    return {};
  }
}

function writeHealth(health: Health) {
  const file = healthFile();
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(health, null, 2));
  fs.renameSync(`${file}.tmp`, file);
}

/** env se 1-3 gateway accounts (namaste ke bina koi cookie/session store nahi hota) */
export function gatewayAccounts(): GatewayAccount[] {
  const accounts: GatewayAccount[] = [];
  for (const index of [1, 2, 3]) {
    const keyId = process.env[`RAZORPAY_KEY_ID_${index}`] ?? (index === 1 ? process.env.RAZORPAY_KEY_ID : "");
    const keySecret =
      process.env[`RAZORPAY_KEY_SECRET_${index}`] ?? (index === 1 ? process.env.RAZORPAY_KEY_SECRET : "");
    const webhookSecret = process.env[`RAZORPAY_WEBHOOK_SECRET_${index}`] ?? process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    if (keyId && keySecret) {
      accounts.push({ id: `razorpay-${index}`, provider: "razorpay", keyId, keySecret, webhookSecret: webhookSecret || "" });
    }
  }
  return accounts;
}

/** healthy accounts pehle, blocked/cooldown wale sabse aakhir me */
export function orderedAccounts(): GatewayAccount[] {
  const health = readHealth();
  const now = Date.now();
  return [...gatewayAccounts()].sort((a, b) => {
    const aBlocked = (health[a.id]?.blockedUntil ?? 0) > now ? 1 : 0;
    const bBlocked = (health[b.id]?.blockedUntil ?? 0) > now ? 1 : 0;
    return aBlocked - bBlocked;
  });
}

function markFailure(accountId: string, message: string) {
  const health = readHealth();
  const current = health[accountId] ?? { failures: 0, blockedUntil: null };
  const failures = current.failures + 1;
  health[accountId] = {
    failures,
    blockedUntil: failures >= 2 ? Date.now() + FAILURE_COOLDOWN_MS : (current.blockedUntil ?? null),
    lastError: message.slice(0, 200),
  };
  writeHealth(health);
}

function markSuccess(accountId: string) {
  const health = readHealth();
  if (health[accountId]) {
    delete health[accountId];
    writeHealth(health);
  }
}

async function razorpayRequest<T>(
  account: GatewayAccount,
  pathName: string,
  init: RequestInit,
): Promise<T> {
  const auth = Buffer.from(`${account.keyId}:${account.keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${pathName}`, {
    ...init,
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text.slice(0, 160)}`);
  }
  return (await response.json()) as T;
}

/**
 * Store ka UPI — gateway down ho to bhi customer pay kar sake, par order manual
 * verify ke baad confirm.
 *
 * `target` = owner ki Google Sheet / admin settings se aaya hua live UPI (caller
 * `getStoreSettings*()` se bhejta hai). Na mile to hi env/default — warna sheet me
 * UPI badalne par ye purana env wala QR bana deta tha.
 */
export type ManualUpiTarget = { vpa?: string; name?: string };

export function manualUpiUri(amountPaise: number, orderNumber: string, target?: ManualUpiTarget): string {
  const vpa = target?.vpa?.trim() || process.env.STORE_UPI_ID || "noorclothing@upi";
  const name = target?.name?.trim() || process.env.STORE_UPI_NAME || "Noor Ethnic Wear";
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: `Order ${orderNumber}`,
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Payment intent banata hai. Gateway fail/block ho to agla account, sab fail hon to
 * manual UPI (order pending hi rehta hai jab tak backend verify na kare).
 */
export async function createIntent(input: {
  orderNumber: string;
  amount: number;
  customerName: string;
  email: string;
  phone: string;
  /** sheet/admin settings ka live UPI (route bhejta hai) */
  upi?: ManualUpiTarget;
}): Promise<PaymentIntentResult> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const accounts = orderedAccounts();

  for (const account of accounts) {
    try {
      const created = await razorpayRequest<{ id: string }>(account, "/orders", {
        method: "POST",
        body: JSON.stringify({
          amount: input.amount,
          currency: "INR",
          receipt: input.orderNumber.slice(0, 40),
          payment_capture: 1,
          notes: { orderNumber: input.orderNumber, phone: input.phone },
        }),
      });
      markSuccess(account.id);
      return {
        mode: "gateway",
        gateway: account.id,
        reference: created.id,
        amount: input.amount,
        upiUri: manualUpiUri(input.amount, input.orderNumber, input.upi),
        publicKey: account.keyId,
        expiresAt,
      };
    } catch (error) {
      markFailure(account.id, error instanceof Error ? error.message : "unknown");
    }
  }

  return {
    mode: "manual-upi",
    gateway: "manual-upi",
    reference: null,
    amount: input.amount,
    upiUri: manualUpiUri(input.amount, input.orderNumber, input.upi),
    expiresAt,
  };
}

/** Razorpay webhook signature: HMAC-SHA256(rawBody, webhookSecret) */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Webhook ke baad gateway API se dobara confirm karta hai — sirf signature kaafi nahi,
 * kyunki replayed body bhi valid signature ke saath aa sakti hai.
 */
export async function fetchGatewayPayment(
  gatewayId: string,
  paymentId: string,
): Promise<{ status: string; amount: number; orderId: string | null } | null> {
  const account = gatewayAccounts().find((candidate) => candidate.id === gatewayId);
  if (!account) return null;
  try {
    const payment = await razorpayRequest<{ status: string; amount: number; order_id?: string }>(
      account,
      `/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET" },
    );
    markSuccess(account.id);
    return { status: payment.status, amount: Number(payment.amount ?? 0), orderId: payment.order_id ?? null };
  } catch (error) {
    markFailure(account.id, error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export function gatewaySummary() {
  const health = readHealth();
  return gatewayAccounts().map((account) => ({
    id: account.id,
    healthy: !((health[account.id]?.blockedUntil ?? 0) > Date.now()),
    failures: health[account.id]?.failures ?? 0,
    lastError: health[account.id]?.lastError ?? null,
  }));
}

/** data dir ban chuki hai ya nahi — pehle write par mkdir */
export function ensurePaymentsDir() {
  fs.mkdirSync(path.dirname(healthFile()), { recursive: true });
}

/* ───────────── purana API surface (checkout isi ko call karta hai) ───────────── */

export type PaymentInitiation =
  | { mode: "redirect"; url: string; provider: "razorpay" }
  | { mode: "manual"; upiId: string; message: string; provider: "manual"; upiUri?: string };

/**
 * Payment link (3 accounts me failover). Sab fail hon to manual UPI —
 * order tab bhi pending rehta hai jab tak backend verify na kare.
 */
export async function createPaymentLink(
  order: { orderNumber: string; total: number; customerName: string; email: string; phone: string },
  upi?: ManualUpiTarget,
): Promise<PaymentInitiation> {
  const callback = `${siteConfig.url}/orders/${order.orderNumber}`;
  for (const account of orderedAccounts()) {
    try {
      const link = await razorpayRequest<{ short_url?: string }>(account, "/payment_links", {
        method: "POST",
        body: JSON.stringify({
          amount: order.total,
          currency: "INR",
          accept_partial: false,
          reference_id: order.orderNumber,
          description: `Noor Ethnic Wear order ${order.orderNumber}`,
          customer: { name: order.customerName, email: order.email, contact: `+91${order.phone}` },
          notify: { sms: true, email: true },
          reminder_enable: true,
          notes: { orderNumber: order.orderNumber },
          callback_url: callback,
          callback_method: "get",
        }),
      });
      if (!link.short_url) throw new Error("payment link missing");
      markSuccess(account.id);
      return { mode: "redirect", url: link.short_url, provider: "razorpay" };
    } catch (error) {
      markFailure(account.id, error instanceof Error ? error.message : "unknown");
    }
  }

  const upiUri = manualUpiUri(order.total, order.orderNumber, upi);
  return {
    mode: "manual",
    provider: "manual",
    upiId: upi?.vpa?.trim() || process.env.STORE_UPI_ID || "noorclothing@upi",
    upiUri,
    message:
      "UPI se pay kariye — payment backend verify hote hi order confirm ho jaayega. WhatsApp par bhi screenshot bhej sakte hain.",
  };
}
