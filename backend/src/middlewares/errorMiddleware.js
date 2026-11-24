import { ZodError } from "zod";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/formatters.js";

export function notFoundMiddleware(req, res) {
  res.status(404).json({
    ok: false,
    code: "NOT_FOUND",
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Datos de entrada inválidos",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled error");

  return res.status(500).json({
    ok: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Ocurrió un error interno en el servidor",
  });
}
