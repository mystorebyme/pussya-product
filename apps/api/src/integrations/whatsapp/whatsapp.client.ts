import { logger } from "../../config/logger";

/** WhatsApp Cloud API — order updates ke liye. Token na ho to no-op. */
export async function sendWhatsApp(phone: string, template: string, params: string[]) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    logger.info("whatsapp_skipped", { phone: phone.slice(-4), template });
    return;
  }
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "template",
      template: { name: template, language: { code: "en" }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
    }),
  });
}
