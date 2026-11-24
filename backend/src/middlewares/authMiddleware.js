import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../config/database.js";
import { AppError } from "../utils/formatters.js";

export async function authMiddleware(req, res, next) {
  try {
    const cookieToken = req.cookies?.[env.cookieName];
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    const token = cookieToken || bearerToken;
    if (!token) {
      return next(new AppError("Autenticación requerida", 401, "UNAUTHORIZED"));
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      return next(new AppError("Sesión inválida o expirada", 401, "INVALID_TOKEN"));
    }

    if (payload.jti) {
      const [revoked] = await pool.query(
        "SELECT id FROM sesiones_revocadas WHERE jti = ? LIMIT 1",
        [payload.jti]
      );
      if (revoked.length > 0) {
        return next(new AppError("Sesión cerrada previamente", 401, "SESSION_REVOKED"));
      }
    }

    const [users] = await pool.query(
      "SELECT id, nombre, correo, rol, estado FROM usuarios_admin WHERE id = ? LIMIT 1",
      [payload.sub]
    );

    if (users.length === 0 || users[0].estado !== "ACTIVO") {
      return next(new AppError("Usuario inactivo o no encontrado", 401, "USER_INACTIVE"));
    }

    req.user = users[0];
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    return next(error);
  }
}
