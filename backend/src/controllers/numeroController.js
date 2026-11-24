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

export async function listarNumerosAdmin(req, res, next) {
  try {
    const rifaId = Number(req.params.id);
    const estado = req.query.estado;
    const buscar = req.query.buscar ? String(req.query.buscar).trim() : null;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(20, Number.parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const [rifas] = await pool.query(
      "SELECT id, titulo, digitos_formato, precio_numero, moneda, estado FROM rifas WHERE id = ? LIMIT 1",
      [rifaId]
    );
    if (rifas.length === 0) {
      throw new AppError("Rifa no encontrada", 404, "RAFFLE_NOT_FOUND");
    }
    const rifa = rifas[0];

    const filters = ["n.id_rifa = ?"];
    const params = [rifaId];

    if (estado && ["DISPONIBLE", "PENDIENTE", "VENDIDO"].includes(estado)) {
      filters.push("n.estado = ?");
      params.push(estado);
    }

    if (buscar !== null && /^\d+$/.test(buscar)) {
      filters.push("n.numero = ?");
      params.push(Number.parseInt(buscar, 10));
    }

    const where = filters.join(" AND ");

    const [[rows], [countRows], [statsRows]] = await Promise.all([
      pool.query(
        `SELECT n.id, n.numero, n.estado, n.id_reserva,
                r.codigo AS reserva_codigo, r.estado AS reserva_estado, r.fecha_vencimiento,
                p.nombres_completos AS participante_nombre, p.whatsapp AS participante_whatsapp
         FROM numeros n
         LEFT JOIN reservas r ON r.id = n.id_reserva
         LEFT JOIN participantes p ON p.id = r.id_participante
         WHERE ${where}
         ORDER BY n.numero ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) AS total FROM numeros n WHERE ${where}`, params),
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
        rifa,
        resumen: statsRows[0],
        pagination: {
          page,
          limit,
          total: Number(countRows[0].total),
          totalPages: Math.max(1, Math.ceil(Number(countRows[0].total) / limit)),
        },
        numeros: rows.map((row) => ({
          id: row.id,
          numero: row.numero,
          etiqueta: formatNumero(row.numero, rifa.digitos_formato),
          estado: row.estado,
          id_reserva: row.id_reserva,
          reserva_codigo: row.reserva_codigo,
          reserva_estado: row.reserva_estado,
          fecha_vencimiento: row.fecha_vencimiento,
          participante_nombre: row.participante_nombre,
          participante_whatsapp: row.participante_whatsapp,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function detalleNumeroAdmin(req, res, next) {
  try {
    const rifaId = Number(req.params.id);
    const numeroVal = Number.parseInt(req.params.numero, 10);

    const [rifas] = await pool.query(
      "SELECT id, titulo, digitos_formato, moneda FROM rifas WHERE id = ? LIMIT 1",
      [rifaId]
    );
    if (rifas.length === 0) {
      throw new AppError("Rifa no encontrada", 404, "RAFFLE_NOT_FOUND");
    }
    const rifa = rifas[0];

    const [numRows] = await pool.query(
      `SELECT n.id, n.numero, n.estado, n.id_reserva,
              r.codigo AS reserva_codigo, r.estado AS reserva_estado,
              r.valor_total, r.cantidad_numeros, r.fecha_reserva, r.fecha_vencimiento,
              p.nombres_completos AS participante_nombre, p.whatsapp AS participante_whatsapp,
              p.correo AS participante_correo
       FROM numeros n
       LEFT JOIN reservas r ON r.id = n.id_reserva
       LEFT JOIN participantes p ON p.id = r.id_participante
       WHERE n.id_rifa = ? AND n.numero = ?
       LIMIT 1`,
      [rifaId, numeroVal]
    );

    if (numRows.length === 0) {
      throw new AppError("Número no encontrado en esta rifa", 404, "NUMBER_NOT_FOUND");
    }

    const actual = numRows[0];

    const [historial] = await pool.query(
      `SELECT r.id AS id_reserva, r.codigo AS reserva_codigo, r.estado AS reserva_estado,
              r.fecha_reserva, r.fecha_vencimiento, rn.precio,
              p.nombres_completos AS participante_nombre, p.whatsapp AS participante_whatsapp,
              pg.codigo AS pago_codigo, pg.estado AS pago_estado, pg.medio_pago,
              pg.valor_reportado, pg.fecha_solicitud
       FROM reserva_numeros rn
       INNER JOIN reservas r ON r.id = rn.id_reserva
       INNER JOIN participantes p ON p.id = r.id_participante
       LEFT JOIN pagos pg ON pg.id_reserva = r.id
       WHERE rn.id_numero = ?
       ORDER BY r.id DESC, pg.id DESC
       LIMIT 25`,
      [actual.id]
    );

    res.json({
      ok: true,
      data: {
        ...actual,
        etiqueta: formatNumero(actual.numero, rifa.digitos_formato),
        moneda: rifa.moneda,
        historial,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function exportarInventarioCsvAdmin(req, res, next) {
  try {
    const rifaId = Number(req.params.id);
    const [rifas] = await pool.query(
      "SELECT id, slug, digitos_formato FROM rifas WHERE id = ? LIMIT 1",
      [rifaId]
    );
    if (rifas.length === 0) {
      throw new AppError("Rifa no encontrada", 404, "RAFFLE_NOT_FOUND");
    }
    const rifa = rifas[0];

    const [rows] = await pool.query(
      `SELECT n.numero, n.estado,
              r.codigo AS reserva_codigo, r.estado AS reserva_estado,
              p.nombres_completos AS participante_nombre, p.whatsapp AS participante_whatsapp,
              (SELECT pg.codigo FROM pagos pg WHERE pg.id_reserva = r.id ORDER BY pg.id DESC LIMIT 1) AS pago_codigo,
              (SELECT pg.estado FROM pagos pg WHERE pg.id_reserva = r.id ORDER BY pg.id DESC LIMIT 1) AS pago_estado
       FROM numeros n
       LEFT JOIN reservas r ON r.id = n.id_reserva
       LEFT JOIN participantes p ON p.id = r.id_participante
       WHERE n.id_rifa = ?
       ORDER BY n.numero ASC`,
      [rifaId]
    );

    const escapeCsv = (val) => {
      const str = val === null || val === undefined ? "" : String(val);
      return `"${str.replaceAll('"', '""')}"`;
    };

    const header = [
      "Numero",
      "Estado",
      "Reserva",
      "Estado Reserva",
      "Participante",
      "WhatsApp",
      "Codigo Pago",
      "Estado Pago",
    ].join(",");

    const lines = rows.map((row) =>
      [
        formatNumero(row.numero, rifa.digitos_formato),
        row.estado,
        row.reserva_codigo || "",
        row.reserva_estado || "",
        row.participante_nombre || "",
        row.participante_whatsapp || "",
        row.pago_codigo || "",
        row.pago_estado || "",
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = `\uFEFF${header}\n${lines.join("\n")}\n`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inventario-${rifa.slug}.csv"`
    );
    res.send(csv);
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
          JSON.stringify({
            id_rifa,
            numeros: ordenados,
            motivo,
            liberados: updateRes.affectedRows,
          }),
        ]
      );

      return { liberados: updateRes.affectedRows };
    });

    res.json({ ok: true, data: resultado });
  } catch (error) {
    next(error);
  }
}
