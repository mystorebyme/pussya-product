import type { EmailJob } from "../../jobs/queues/email.queue";

const wrap = (title: string, body: string) => `<!doctype html>
<html><body style="margin:0;background:#faf6f1;font-family:Helvetica,Arial,sans-serif;color:#2f2a25">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:28px">
    <p style="letter-spacing:6px;color:#862222;font-family:Georgia,serif;font-size:20px;margin:0 0 4px">NOOR</p>
    <p style="letter-spacing:4px;font-size:9px;color:#862222;margin:0 0 18px">CLOTHING</p>
    <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="margin-top:24px;font-size:12px;color:#6b6259">Questions? WhatsApp  · info.noorethnicwear@gmail.com</p>
  </div>
</body></html>`;

export const templates = {
  "order-placed": (job: Extract<EmailJob, { type: "order-placed" }>) => ({
    subject: `Order ${job.orderNumber} received — Noor Ethnic Wear`,
    html: wrap(
      "We have your order",
      `<p style="font-size:14px;line-height:1.6">Thank you for shopping with Noor Ethnic Wear. Your order <strong>${job.orderNumber}</strong> is confirmed.</p>
       <p style="font-size:14px;line-height:1.6">We dispatch within 1–2 working days and share tracking on WhatsApp.</p>`,
    ),
    text: `Order ${job.orderNumber} received. We dispatch within 1-2 working days.`,
  }),
  "order-paid": (job: Extract<EmailJob, { type: "order-paid" }>) => ({
    subject: `Payment received for ${job.orderNumber}`,
    html: wrap(
      "Payment received",
      `<p style="font-size:14px;line-height:1.6">We have received your payment for order <strong>${job.orderNumber}</strong>. Your parcel is being packed.</p>`,
    ),
    text: `Payment received for ${job.orderNumber}.`,
  }),
  "order-shipped": (job: Extract<EmailJob, { type: "order-shipped" }>) => ({
    subject: `Order ${job.orderNumber} shipped`,
    html: wrap(
      "On its way",
      `<p style="font-size:14px;line-height:1.6">Order <strong>${job.orderNumber}</strong> is on its way. Tracking: <strong>${job.awb}</strong>.</p>`,
    ),
    text: `Order ${job.orderNumber} shipped. AWB ${job.awb}.`,
  }),
};
