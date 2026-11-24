import { AppError } from "../utils/formatters.js";

/**
 * Valida que el rol autenticado pertenezca a la lista autorizada (Sección 3.5).
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Autenticación requerida", 401, "UNAUTHORIZED"));
    }
    if (!allowedRoles.includes(req.user.rol)) {
      return next(
        new AppError(
          "No tienes permisos para realizar esta acción",
          403,
          "FORBIDDEN"
        )
      );
    }
    return next();
  };
}
