import { drain, type EmailJob } from "../queues/email.queue";
import { logger } from "../../config/logger";
import { sendEmail } from "../../integrations/email/email.client";

/** Alag process me chalega (`worker.ts`) — API ke response time par asar nahi */
export async function runEmailWorker() {
  const jobs = drain();
  for (const job of jobs) {
    try {
      await sendEmail(job as EmailJob);
    } catch (error) {
      logger.error("email_job_failed", { type: job.type, error: String(error) });
    }
  }
  return jobs.length;
}

export function startEmailWorker(intervalMs = 5_000) {
  setInterval(() => {
    void runEmailWorker();
  }, intervalMs);
}
