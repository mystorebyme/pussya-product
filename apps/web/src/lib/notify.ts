import "server-only";

import { siteConfig } from "@/config/site";

/**
 * Contact form ka email delivery.
 *
 * Message pehle hi DB/local me save ho jaata hai (kabhi na khoye), ye sirf
 * "owner ko email chala jaaye" ka best-effort layer hai. Teen provider support:
 *
 *  1. `RESEND_API_KEY` — Resend (free tier 3,000/month). Sabse saaf.
 *  2. `CONTACT_FORM_ENDPOINT` — koi bhi webhook (Google Apps Script / Zapier /
 *     Make). POST JSON.
 *  3. FormSubmit (`https://formsubmit.co/ajax/<email>`) — **koi key nahi chahiye,
 *     unlimited**, free. Pehli submission par owner ke inbox me ek activation
 *     mail aata hai; usme "Activate" dabane ke baad aage ke saare messages seedhe
 *     mail me aate hain.
 *
 * Sab fail ho jaayein to bhi customer ko success hi dikhta hai — message DB me
 * safe hai aur admin panel me dikhta hai.
 */

export type NotifyResult = { channel: string; ok: boolean; detail?: string };

const TIMEOUT_MS = 8_000;

function ownerEmail(): string {
  return (
    process.env.CONTACT_EMAIL ??
    process.env.SELLER_EMAIL ??
    process.env.ORDER_NOTIFICATION_EMAIL ??
    siteConfig.email
  );
}

/**
 * Public channels — sirf WhatsApp. Owner rule: site/API par support email kahin
 * dikhega nahi, isliye `mailto` yahan se hata diya gaya hai (email sirf andar,
 * owner ko notification bhejne ke liye use hota hai).
 */
export function contactChannels() {
  return {
    whatsapp: siteConfig.whatsapp,
  };
}

function formatMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): string {
  return [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone ?? "—"}`,
    `Subject: ${input.subject ?? "Website message"}`,
    "",
    input.message,
    "",
    `— Noor Ethnic Wear website (${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST)`,
  ].join("\n");
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, text: text.slice(0, 300) };
}

export async function notifyContactMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): Promise<NotifyResult[]> {
  const results: NotifyResult[] = [];
  const to = ownerEmail();
  // Owner rule: support email site par nahi. Agar env me koi owner address nahi
  // diya gaya to email layer chup-chaap skip ho jaata hai (message DB + Sheet me
  // to jaata hi hai) — khaali address par request bhej kar error nahi banate.
  if (!to) return [{ channel: "sheet", ok: true, detail: "message saved to the DB + Google Sheet" }];
  const subject = `New website message — ${input.subject ?? "General"} (${input.name})`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.EMAIL_FROM ?? "Noor Ethnic Wear <onboarding@resend.dev>";
    try {
      const result = await post(
        "https://api.resend.com/emails",
        { from, to: [to], reply_to: input.email, subject, text: formatMessage(input) },
        { authorization: `Bearer ${resendKey}` },
      );
      results.push({ channel: "resend", ok: result.ok, detail: result.ok ? undefined : `${result.status} ${result.text}` });
    } catch (error) {
      results.push({ channel: "resend", ok: false, detail: error instanceof Error ? error.message : "failed" });
    }
  }

  const customEndpoint = process.env.CONTACT_FORM_ENDPOINT;
  if (customEndpoint) {
    try {
      const result = await post(customEndpoint, { to, subject, ...input });
      results.push({ channel: "webhook", ok: result.ok, detail: result.ok ? undefined : `${result.status}` });
    } catch (error) {
      results.push({ channel: "webhook", ok: false, detail: error instanceof Error ? error.message : "failed" });
    }
  }

  // FormSubmit — key ke bina, unlimited. Env se band bhi kar sakte hain (CONTACT_FORMSUBMIT=off)
  if (process.env.CONTACT_FORMSUBMIT !== "off" && !resendKey) {
    try {
      const result = await post(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
        _subject: subject,
        _template: "table",
        _captcha: "false",
        name: input.name,
        email: input.email,
        phone: input.phone ?? "",
        subject: input.subject ?? "Website message",
        message: input.message,
      });
      results.push({
        channel: "formsubmit",
        ok: result.ok,
        detail: result.ok ? undefined : `${result.status} ${result.text}`,
      });
    } catch (error) {
      results.push({ channel: "formsubmit", ok: false, detail: error instanceof Error ? error.message : "failed" });
    }
  }

  return results;
}
