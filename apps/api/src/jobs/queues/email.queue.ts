import { logger } from "../../config/logger";

export type EmailJob =
  | { type: "order-placed"; orderNumber: string; to: string }
  | { type: "order-paid"; orderNumber: string; to: string }
  | { type: "order-shipped"; orderNumber: string; to: string; awb: string };

/**
 * Phase 1 me in-process array (yahi interface BullMQ me badalta hai).
 * API request kabhi email bhejne par wait nahi karti.
 */
const queue: EmailJob[] = [];

export function enqueue(job: EmailJob) {
  queue.push(job);
  logger.info("email_job_queued", { type: job.type, order: job.orderNumber });
}

export function drain(): EmailJob[] {
  return queue.splice(0, queue.length);
}

export function size() {
  return queue.length;
}
