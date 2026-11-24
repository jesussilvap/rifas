import { env } from "../config/env.js";
import { AppError } from "../utils/formatters.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Protección CSRF basada en validación estricta de Origin/Referer
 * cuando se utiliza cookie de sesión en solicitudes que modifican estado.
 */
export function csrfMiddleware(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (!req.cookies?.[env.cookieName]) return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const isAllowedOrigin = (value) => {
    if (!value) return false;
    return env.corsOrigins.some((allowed) => value.startsWith(allowed));
  };

  if (isAllowedOrigin(origin) || isAllowedOrigin(referer)) {
    return next();
  }

  return next(
    new AppError("Solicitud rechazada por validación CSRF", 403, "CSRF_FAILED")
  );
}
