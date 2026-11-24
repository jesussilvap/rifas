import fs from "node:fs";
import { pool, withTransaction } from "../config/database.js";
import { storageService } from "../services/storageService.js";
import { AppError, formatNumero } from "../utils/formatters.js";
import { registrarSorteoSchema } from "../validators/schemas.js";

function toMysqlDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const normalized = hasTimezone ? raw : `${raw.replace(" ", "T")}-05:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function listarSorteosAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.id_rifa, s.nombre_loteria, s.fecha_sorteo, s.resultado_oficial,
              s.numero_ganador, s.id_numero_ganador, s.evidencia_url, s.acta_url,
              s.observaciones, s.creado_en,
              rf.titulo AS rifa_titulo, rf.slug AS rifa_slug,
              rf.digitos_formato, rf.estado AS rifa_estado,
              n.estado AS numero_estado,
              r.codigo AS reserva_codigo,
              p.nombres_completos AS ganador_nombre, p.whatsapp AS ganador_whatsapp,
              u.nombre AS registrado_por_nombre
       FROM sorteos s
       INNER JOIN rifas rf ON rf.id = s.id_rifa
       LEFT JOIN numeros n ON n.id = s.id_numero_ganador
       LEFT JOIN reservas r ON r.id = n.id_reserva
       LEFT JOIN participantes p ON p.id = r.id_participante
       LEFT JOIN usuarios_admin u ON u.id = s.registrado_por
       ORDER BY s.fecha_sorteo DESC, s.id DESC
       LIMIT 100`
    );

    const data = rows.map((row) => ({
      ...row,
      numero_ganador_etiqueta:
        row.numero_ganador !== null && row.numero_ganador !== undefined
          ? formatNumero(row.numero_ganador, row.digitos_formato)
          : null,
      tiene_acta_imagen: Boolean(row.acta_url),
    }));

    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function registrarSorteoAdmin(req, res, next) {
  try {
    const rifaId = Number(req.params.id);
    const input = registrarSorteoSchema.parse(req.body);
    const fechaMysql = toMysqlDateTime(input.fecha_sorteo);
    if (!fechaMysql) {
      throw new AppError("Fecha de sorteo inválida", 400, "INVALID_DATE");
    }

    const result = await withTransaction(async (conn) => {
      const [rifas] = await conn.query(
        "SELECT id, titulo, digitos_formato, estado FROM rifas WHERE id = ? FOR UPDATE",
        [rifaId]
      );
      if (rifas.length === 0) {
        throw new AppError("Rifa no encontrada", 404, "RAFFLE_NOT_FOUND");
      }
      const rifa = rifas[0];

      const [numRows] = await conn.query(
        `SELECT n.id, n.numero, n.estado, r.codigo AS reserva_codigo,
                p.nombres_completos AS ganador_nombre, p.whatsapp AS ganador_whatsapp
         FROM numeros n
         LEFT JOIN reservas r ON r.id = n.id_reserva
         LEFT JOIN participantes p ON p.id = r.id_participante
         WHERE n.id_rifa = ? AND n.numero = ?
         LIMIT 1`,
        [rifaId, input.numero_ganador]
      );

      if (numRows.length === 0) {
        throw new AppError(
          `El número ${input.numero_ganador} no existe en el rango de esta rifa`,
          400,
          "NUMBER_OUT_OF_RANGE"
        );
      }

      const numeroRow = numRows[0];

      const [insertRes] = await conn.query(
        `INSERT INTO sorteos
         (id_rifa, nombre_loteria, fecha_sorteo, resultado_oficial, numero_ganador,
          id_numero_ganador, evidencia_url, observaciones, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?)`,
        [
          rifaId,
          input.nombre_loteria,
          fechaMysql,
          input.resultado_oficial,
          input.numero_ganador,
          numeroRow.id,
          input.evidencia_url || "",
          input.observaciones || "",
          req.user.id,
        ]
      );

      if (input.finalizar_rifa) {
        await conn.query("UPDATE rifas SET estado = 'FINALIZADA' WHERE id = ?", [rifaId]);
      }

      await conn.query(
        `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
         VALUES (?, 'REGISTRAR_SORTEO', 'sorteos', ?, ?)`,
        [
          req.user.id,
          insertRes.insertId,
          JSON.stringify({
            id_rifa: rifaId,
            nombre_loteria: input.nombre_loteria,
            resultado_oficial: input.resultado_oficial,
            numero_ganador: input.numero_ganador,
            numero_estado: numeroRow.estado,
            finalizar_rifa: input.finalizar_rifa,
          }),
        ]
      );

      return {
        id: insertRes.insertId,
        id_rifa: rifaId,
        numero_ganador_etiqueta: formatNumero(input.numero_ganador, rifa.digitos_formato),
        numero_estado: numeroRow.estado,
        ganador:
          numeroRow.estado === "VENDIDO"
            ? {
                nombre: numeroRow.ganador_nombre,
                whatsapp: numeroRow.ganador_whatsapp,
                reserva_codigo: numeroRow.reserva_codigo,
              }
            : null,
      };
    });

    res.status(201).json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function subirEvidenciaSorteoAdmin(req, res, next) {
  try {
    const sorteoId = Number(req.params.id);
    if (!req.validatedImage) {
      throw new AppError("Debes adjuntar una imagen válida del acta o evidencia", 400);
    }

    const [rows] = await pool.query("SELECT id FROM sorteos WHERE id = ? LIMIT 1", [
      sorteoId,
    ]);
    if (rows.length === 0) {
      throw new AppError("Sorteo no encontrado", 404, "DRAW_NOT_FOUND");
    }

    const saved = await storageService.saveBuffer({
      visibility: "private",
      folder: "actas_sorteo",
      buffer: req.validatedImage.buffer,
      ext: req.validatedImage.ext,
    });

    await pool.query("UPDATE sorteos SET acta_url = ? WHERE id = ?", [
      saved.key,
      sorteoId,
    ]);

    await pool.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
       VALUES (?, 'SUBIR_ACTA_SORTEO', 'sorteos', ?, ?)`,
      [req.user.id, sorteoId, JSON.stringify({ archivo: saved.key })]
    );

    res.status(201).json({ ok: true, data: { id: sorteoId, tiene_acta_imagen: true } });
  } catch (error) {
    next(error);
  }
}

export async function servirEvidenciaSorteoAdmin(req, res, next) {
  try {
    const sorteoId = Number(req.params.id);
    const [rows] = await pool.query(
      "SELECT id, acta_url FROM sorteos WHERE id = ? LIMIT 1",
      [sorteoId]
    );

    if (rows.length === 0 || !rows[0].acta_url) {
      throw new AppError("Evidencia del sorteo no encontrada", 404, "EVIDENCE_NOT_FOUND");
    }

    const file = await storageService.readFile({
      visibility: "private",
      key: rows[0].acta_url,
    });
    if (!file) {
      throw new AppError("Archivo de evidencia no disponible", 404, "FILE_MISSING");
    }

    res.setHeader("Content-Type", file.mime || "image/webp");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.send(file.buffer);
  } catch (error) {
    return next(error);
  }
}
