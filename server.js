import { assertProductionEnv, env } from "./backend/src/config/env.js";
import { pool } from "./backend/src/config/database.js";
import { createApp } from "./backend/src/app.js";
import {
  startReservationExpirationJob,
  stopReservationExpirationJob,
} from "./backend/src/jobs/liberarReservas.js";
import { logger } from "./backend/src/utils/logger.js";

assertProductionEnv();

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, env: env.nodeEnv, timezone: env.timezone },
    "DevSoluciones Rifas escuchando"
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
