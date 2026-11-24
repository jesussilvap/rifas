import fs from "node:fs";
import { pool } from "../config/database.js";
import {
  aprobarPago,
  rechazarPago,
  reportarPago,
} from "../services/pagoService.js";
import { storageService } from "../services/storageService.js";
import { buildWhatsappLink } from "../services/whatsappService.js";
import { AppError } from "../utils/formatters.js";
import {
  rechazarPagoSchema,
  reportPagoSchema,
} from "../validators/schemas.js";

export async function reportarPagoPublico(req, res, next) {
  try {
    const input = reportPagoSchema.parse(req.body);
    const idempotencyKey = req.headers["idempotency-key"]
      ? String(req.headers["idempotency-key"]).trim().slice(0, 64)
      : null;

    const result = await reportarPago({
      ...input,
      idempotencyKey,
      validatedImage: req.validatedImage,
    });

    // Preparar datos de WhatsApp para el Paso 2
    const [cfgRows] = await pool.query(
      "SELECT whatsapp_comprobantes, instrucciones_whatsapp, plantilla_mensaje_whatsapp FROM configuracion_general ORDER BY id ASC LIMIT 1"
    );

    let whatsappData = null;
    if (cfgRows.length > 0 && !result.duplicated) {
      const cfg = cfgRows[0];
      const valorFormateado = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: result.pago.moneda || "COP",
        maximumFractionDigits: 0,
      }).format(result.pago.valor_esperado);

      whatsappData = {
        instrucciones: cfg.instrucciones_whatsapp,
        ...buildWhatsappLink({
          whatsappInternacional: cfg.whatsapp_comprobantes,
          rifa: result.pago.rifa_titulo,
          participante: result.pago.participante,
          numeros: result.pago.numeros,
          valorFormateado,
          codigoSolicitud: result.pago.codigo,
          plantilla: cfg.plantilla_mensaje_whatsapp,
        }),
      };
    }

    res.status(result.duplicated ? 200 : 201).json({
      ok: true,
      duplicated: result.duplicated,
      data: {
        pago: result.pago,
        whatsapp: whatsappData,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listarPagosAdmin(req, res, next) {
  try {
    const estado = req.query.estado;
    const filters = [];
    const params = [];

    if (
      estado &&
      ["PENDIENTE", "APROBADO", "RECHAZADO", "REQUIERE_REVISION"].includes(estado)
    ) {
      filters.push("pg.estado = ?");
      params.push(estado);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT pg.id, pg.codigo, pg.medio_pago, pg.valor_esperado, pg.valor_reportado,
              pg.referencia_transferencia, pg.estado, pg.observaciones,
              pg.fecha_solicitud, pg.fecha_revision,
              r.codigo AS codigo_reserva, r.cantidad_numeros,
              rf.titulo AS rifa_titulo, rf.digitos_formato, rf.moneda, rf.fecha_sorteo,
              p.nombres_completos AS participante_nombre, p.whatsapp AS participante_whatsapp,
              u.nombre AS revisado_por_nombre,
              GROUP_CONCAT(LPAD(n.numero, rf.digitos_formato, '0') ORDER BY n.numero ASC SEPARATOR ', ') AS numeros
       FROM pagos pg
       INNER JOIN reservas r ON r.id = pg.id_reserva
       INNER JOIN rifas rf ON rf.id = r.id_rifa
       INNER JOIN participantes p ON p.id = r.id_participante
       LEFT JOIN usuarios_admin u ON u.id = pg.revisado_por
       LEFT JOIN reserva_numeros rn ON rn.id_reserva = r.id
       LEFT JOIN numeros n ON n.id = rn.id_numero
       ${where}
       GROUP BY pg.id
       ORDER BY pg.fecha_solicitud DESC
       LIMIT 200`,
      params
    );

    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function servirComprobantePrivadoAdmin(req, res, next) {
  try {
    const pagoId = Number(req.params.id);
    const [rows] = await pool.query(
      "SELECT id, codigo, comprobante_url, comprobante_mime FROM pagos WHERE id = ? LIMIT 1",
      [pagoId]
    );

    if (rows.length === 0 || !rows[0].comprobante_url) {
      throw new AppError("Comprobante no encontrado", 404, "RECEIPT_NOT_FOUND");
    }

    const pago = rows[0];
    const file = await storageService.readFile({
      visibility: "private",
      key: pago.comprobante_url,
    });
    if (!file) {
      throw new AppError("Archivo de comprobante no disponible", 404, "FILE_MISSING");
    }

    // Registrar acceso en auditoría en segundo plano para no retrasar la entrega de la imagen
    pool
      .query(
        `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
         VALUES (?, 'CONSULTAR_COMPROBANTE', 'pagos', ?, ?)`,
        [req.user.id, pago.id, JSON.stringify({ codigo_pago: pago.codigo })]
      )
      .catch(() => {});

    res.setHeader("Content-Type", file.mime || pago.comprobante_mime || "image/webp");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.send(file.buffer);
  } catch (error) {
    return next(error);
  }
}

export async function aprobarPagoAdmin(req, res, next) {
  try {
    const pagoId = Number(req.params.id);
    const data = await aprobarPago({
      pagoId,
      adminUserId: req.user.id,
      referenciaTransferencia: req.body?.referencia_transferencia,
      observaciones: req.body?.observaciones,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function rechazarPagoAdmin(req, res, next) {
  try {
    const pagoId = Number(req.params.id);
    const input = rechazarPagoSchema.parse(req.body);
    const data = await rechazarPago({
      pagoId,
      adminUserId: req.user.id,
      observaciones: input.observaciones,
      accion: input.accion,
      minutosProrroga: input.minutos_prorroga,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
