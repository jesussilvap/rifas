import { pool, withTransaction } from "../config/database.js";
import { AppError, formatNumero } from "../utils/formatters.js";
import { liberarNumerosSchema } from "../validators/schemas.js";

export async function listarNumerosPorRifa(req, res, next) {
  try {
    const rifaId = Number(req.params.id);
    const estado = req.query.estado;
    const buscar = req.query.buscar ? String(req.query.buscar).trim() : null;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(20, Number.parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const [rifas] = await pool.query(
      "SELECT id, digitos_formato, precio_numero, estado FROM rifas WHERE id = ? LIMIT 1",
      [rifaId]
    );
    if (rifas.length === 0) {
      throw new AppError("Rifa no encontrada", 404, "RAFFLE_NOT_FOUND");
    }
    const rifa = rifas[0];

    const filters = ["id_rifa = ?"];
    const params = [rifaId];

    if (estado && ["DISPONIBLE", "PENDIENTE", "VENDIDO"].includes(estado)) {
      filters.push("estado = ?");
      params.push(estado);
    }

    if (buscar !== null && /^\d+$/.test(buscar)) {
      filters.push("numero = ?");
      params.push(Number.parseInt(buscar, 10));
    }

    const where = filters.join(" AND ");

    const [[rows], [countRows], [statsRows]] = await Promise.all([
      pool.query(
        `SELECT numero, estado FROM numeros WHERE ${where} ORDER BY numero ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) AS total FROM numeros WHERE ${where}`, params),
      pool.query(
        `SELECT COUNT(*) AS total,
                SUM(estado = 'DISPONIBLE') AS disponibles,
                SUM(estado = 'PENDIENTE') AS pendientes,
                SUM(estado = 'VENDIDO') AS vendidos
         FROM numeros WHERE id_rifa = ?`,
        [rifaId]
      ),
    ]);

    res.json({
      ok: true,
      data: {
        digitos_formato: rifa.digitos_formato,
        precio_numero: Number(rifa.precio_numero),
        resumen: statsRows[0],
        pagination: {
          page,
          limit,
          total: Number(countRows[0].total),
          totalPages: Math.ceil(Number(countRows[0].total) / limit),
        },
        numeros: rows.map((row) => ({
          numero: row.numero,
          etiqueta: formatNumero(row.numero, rifa.digitos_formato),
          estado: row.estado,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function liberarNumerosManualAdmin(req, res, next) {
  try {
    const { id_rifa, numeros, motivo } = liberarNumerosSchema.parse(req.body);
    const ordenados = [...new Set(numeros)].sort((a, b) => a - b);

    const resultado = await withTransaction(async (conn) => {
      const placeholders = ordenados.map(() => "?").join(",");
      const [rows] = await conn.query(
        `SELECT id, numero, estado, id_reserva
         FROM numeros
         WHERE id_rifa = ? AND numero IN (${placeholders})
         ORDER BY numero ASC
         FOR UPDATE`,
        [id_rifa, ...ordenados]
      );

      const bloqueados = rows.filter((r) => r.estado === "VENDIDO");
      if (bloqueados.length > 0) {
        throw new AppError(
          "No se pueden liberar números que ya están en estado VENDIDO",
          409,
          "CANNOT_RELEASE_SOLD"
        );
      }

      const [updateRes] = await conn.query(
        `UPDATE numeros
         SET estado = 'DISPONIBLE', id_reserva = NULL
         WHERE id_rifa = ? AND numero IN (${placeholders}) AND estado = 'PENDIENTE'`,
        [id_rifa, ...ordenados]
      );

      await conn.query(
        `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
         VALUES (?, 'LIBERAR_NUMEROS_MANUAL', 'numeros', ?, ?)`,
        [
          req.user.id,
          id_rifa,
          JSON.stringify({ id_rifa, numeros: ordenados, motivo, liberados: updateRes.affectedRows }),
        ]
      );

      return { liberados: updateRes.affectedRows };
    });

    res.json({ ok: true, data: resultado });
  } catch (error) {
    next(error);
  }
}
