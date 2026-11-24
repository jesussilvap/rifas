import cron from "node-cron";
import { env } from "../config/env.js";
import { liberarReservasExpiradas } from "../services/reservaService.js";
import { logger } from "../utils/logger.js";

let task = null;

export function startReservationExpirationJob() {
  if (task) return task;

  task = cron.schedule(env.reservationCron, async () => {
    try {
      const result = await liberarReservasExpiradas();
      if (result.expiradas > 0) {
        logger.info(result, "Reservas expiradas liberadas automáticamente");
      }
    } catch (error) {
      logger.error({ err: error }, "Error en job de liberación de reservas");
    }
  });

  logger.info({ cron: env.reservationCron }, "Job de liberación de reservas iniciado");
  return task;
}

export function stopReservationExpirationJob() {
  if (task) {
    task.stop();
    task = null;
  }
}
