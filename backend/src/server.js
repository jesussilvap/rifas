import { assertProductionEnv, env } from "./config/env.js";
import { pool } from "./config/database.js";
import { createApp } from "./app.js";
import {
  startReservationExpirationJob,
  stopReservationExpirationJob,
} from "./jobs/liberarReservas.js";
import { logger } from "./utils/logger.js";

assertProductionEnv();

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, env: env.nodeEnv, timezone: env.timezone },
    "DevSoluciones Rifas API escuchando"
  );
  startReservationExpirationJob();
});

async function shutdown(signal) {
  logger.info({ signal }, "Cerrando servidor...");
  stopReservationExpirationJob();
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
