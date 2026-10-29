import { startEmailWorker } from "./jobs/workers/email.worker";
import { logger } from "./config/logger";

/** API se alag process: queue workers yahan chalte hain (alag scale hota hai) */
logger.info("worker_started");
startEmailWorker();
