import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

const app = createApp();

const server = app.listen(env.port, "0.0.0.0", () => {
  logger.info("api_started", { port: env.port, env: env.nodeEnv });
});

/** Graceful shutdown: naye connections band, chalte hue requests poore */
function shutdown(signal: string) {
  logger.info("shutdown", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
