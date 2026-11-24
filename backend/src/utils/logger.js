import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.isProd ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "password_hash"],
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/api/health",
  },
});
