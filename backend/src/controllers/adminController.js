import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/formatters.js";
import { loginSchema } from "../validators/schemas.js";

export async function loginAdmin(req, res, next) {
  try {
    const { correo, password } = loginSchema.parse(req.body);
    const [users] = await pool.query(
      "SELECT id, nombre, correo, password_hash, rol, estado FROM usuarios_admin WHERE correo = ? LIMIT 1",
      [correo.toLowerCase()]
    );

    if (users.length === 0 || users[0].estado !== "ACTIVO") {
      throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub: user.id, rol: user.rol, jti },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    res.cookie(env.cookieName, token, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      ok: true,
      data: {
        usuario: {
          id: user.id,
          nombre: user.nombre,
          correo: user.correo,
          rol: user.rol,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutAdmin(req, res, next) {
  try {
    if (req.tokenPayload?.jti && req.tokenPayload?.exp) {
      await pool.query(
        "INSERT IGNORE INTO sesiones_revocadas (jti, expira_en) VALUES (?, FROM_UNIXTIME(?))",
        [req.tokenPayload.jti, req.tokenPayload.exp]
      );
    }

    res.clearCookie(env.cookieName, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
    });

    res.json({ ok: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    next(error);
  }
}

export async function meAdmin(req, res) {
  res.json({ ok: true, data: { usuario: req.user } });
}

export async function dashboardAdmin(req, res, next) {
  try {
    const [[rifasStats], [numerosStats], [pagosStats]] = await Promise.all([
      pool.query(
        `SELECT SUM(estado = 'PUBLICADA') AS rifas_publicadas,
                SUM(estado IN ('BORRADOR', 'EN_REVISION')) AS rifas_borrador_revision
         FROM rifas`
      ),
      pool.query(
        `SELECT COUNT(*) AS total_numeros,
                SUM(estado = 'DISPONIBLE') AS disponibles,
                SUM(estado = 'PENDIENTE') AS pendientes,
                SUM(estado = 'VENDIDO') AS vendidos
         FROM numeros`
      ),
      pool.query(
        `SELECT SUM(estado = 'PENDIENTE') AS pagos_pendientes,
                SUM(estado = 'APROBADO') AS pagos_aprobados,
                SUM(estado = 'RECHAZADO') AS pagos_rechazados,
                COALESCE(SUM(CASE WHEN estado IN ('PENDIENTE', 'APROBADO') THEN valor_reportado ELSE 0 END), 0) AS recaudo_reportado,
                COALESCE(SUM(CASE WHEN estado = 'APROBADO' THEN valor_esperado ELSE 0 END), 0) AS recaudo_verificado
         FROM pagos`
      ),
    ]);

    res.json({
      ok: true,
      data: {
        ...rifasStats[0],
        ...numerosStats[0],
        ...pagosStats[0],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listarParticipantesAdmin(req, res, next) {
  try {
    const q = req.query.q ? `%${String(req.query.q).trim()}%` : null;
    const where = q ? "WHERE p.nombres_completos LIKE ? OR p.whatsapp LIKE ?" : "";
    const params = q ? [q, q] : [];

    const [rows] = await pool.query(
      `SELECT p.id, p.nombres_completos, p.whatsapp, p.correo, p.creado_en,
              COUNT(DISTINCT r.id) AS total_reservas,
              COALESCE(SUM(CASE WHEN r.estado = 'COMPLETADA' THEN r.cantidad_numeros ELSE 0 END), 0) AS numeros_comprados
       FROM participantes p
       LEFT JOIN reservas r ON r.id_participante = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.id DESC
       LIMIT 200`,
      params
    );

    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function listarAuditoriaAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.accion, a.tabla_afectada, a.registro_id, a.detalle, a.fecha,
              u.nombre AS usuario_nombre, u.rol AS usuario_rol
       FROM auditoria a
       LEFT JOIN usuarios_admin u ON u.id = a.id_usuario
       ORDER BY a.id DESC
       LIMIT 200`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
}
