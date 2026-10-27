import { logger } from "../../config/logger";
import { templates } from "./templates";
import type { EmailJob } from "../../jobs/queues/email.queue";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

/** Provider: Resend. Key na ho to log-only mode (dev/preview), app crash nahi. */
export async function sendEmail(job: EmailJob) {
  if (!job.to) return;
  const { subject, html, text } = templates[job.type](job as never);

  if (!RESEND_API_KEY) {
    logger.info("email_skipped_no_provider", { type: job.type, to: job.to, subject });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Noor Ethnic Wear <orders@noorethnicwear.in>",
      to: [job.to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) throw new Error(`email provider ${response.status}`);
}
