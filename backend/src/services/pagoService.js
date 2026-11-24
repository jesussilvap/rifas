import { withTransaction } from "../config/database.js";
import { storageService } from "./storageService.js";
import { AppError, formatNumero, generateCode } from "../utils/formatters.js";

/**
 * Registra el reporte de pago y comprobante privado (Paso 1 -> Paso 2).
 * Idempotente mediante idempotency_key y seguro frente a la expiración concurrente.
 */
export async function reportarPago({
  token_acceso,
  medio_pago,
  valor_reportado,
  referencia_transferencia,
  idempotencyKey,
  validatedImage,
}) {
  if (!validatedImage) {
    throw new AppError("Debes adjuntar la imagen del comprobante de pago", 400, "RECEIPT_REQUIRED");
  }

  // Guardar el comprobante en almacenamiento privado antes de escribir en DB
  const savedFile = await storageService.saveBuffer({
    visibility: "private",
    folder: "comprobantes",
    buffer: validatedImage.buffer,
    ext: validatedImage.ext,
  });

  return withTransaction(async (conn) => {
    if (idempotencyKey) {
      const [existingByKey] = await conn.query(
        "SELECT id, codigo, estado, valor_esperado, valor_reportado, fecha_solicitud FROM pagos WHERE idempotency_key = ? LIMIT 1",
        [idempotencyKey]
      );
      if (existingByKey.length > 0) {
        return { duplicated: true, pago: existingByKey[0] };
      }
    }

    const [reservas] = await conn.query(
      `SELECT r.id, r.codigo, r.estado, r.valor_total, r.fecha_vencimiento,
              rf.titulo AS rifa_titulo, rf.digitos_formato, rf.moneda,
              p.nombres_completos
       FROM reservas r
       INNER JOIN rifas rf ON rf.id = r.id_rifa
       INNER JOIN participantes p ON p.id = r.id_participante
       WHERE r.token_acceso = ?
       FOR UPDATE`,
      [token_acceso]
    );

    if (reservas.length === 0) {
      throw new AppError("Reserva no encontrada", 404, "RESERVATION_NOT_FOUND");
    }

    const reserva = reservas[0];
    if (reserva.estado !== "ACTIVA") {
      throw new AppError(
        `No es posible reportar pago para una reserva en estado ${reserva.estado}`,
        409,
        "RESERVATION_NOT_ACTIVE"
      );
    }

    if (new Date(reserva.fecha_vencimiento) <= new Date()) {
      throw new AppError(
        "Tu reserva ha vencido. Por favor selecciona tus números nuevamente.",
        409,
        "RESERVATION_EXPIRED"
      );
    }

    const [pendingPayments] = await conn.query(
      "SELECT id FROM pagos WHERE id_reserva = ? AND estado = 'PENDIENTE' LIMIT 1",
      [reserva.id]
    );
    if (pendingPayments.length > 0) {
      throw new AppError(
        "Esta reserva ya tiene un comprobante pendiente de verificación",
        409,
        "PAYMENT_ALREADY_PENDING"
      );
    }

    const codigoPago = generateCode("PAG");
    const [pagoResult] = await conn.query(
      `INSERT INTO pagos
       (codigo, id_reserva, idempotency_key, medio_pago, valor_esperado, valor_reportado,
        comprobante_url, comprobante_nombre_original, comprobante_mime,
        comprobante_tamano_bytes, comprobante_subido_en, referencia_transferencia,
        estado, fecha_solicitud)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), NULLIF(?, ''), 'PENDIENTE', UTC_TIMESTAMP())`,
      [
        codigoPago,
        reserva.id,
        idempotencyKey || null,
        medio_pago,
        reserva.valor_total,
        valor_reportado,
        savedFile.key,
        validatedImage.originalName,
        validatedImage.mime,
        validatedImage.size,
        referencia_transferencia || "",
      ]
    );

    await conn.query(
      "UPDATE reservas SET estado = 'PENDIENTE_VERIFICACION' WHERE id = ?",
      [reserva.id]
    );

    const [nums] = await conn.query(
      `SELECT n.numero
       FROM reserva_numeros rn
       INNER JOIN numeros n ON n.id = rn.id_numero
       WHERE rn.id_reserva = ?
       ORDER BY n.numero ASC`,
      [reserva.id]
    );

    return {
      duplicated: false,
      pago: {
        id: pagoResult.insertId,
        codigo: codigoPago,
        codigo_reserva: reserva.codigo,
        estado: "PENDIENTE",
        medio_pago,
        valor_esperado: Number(reserva.valor_total),
        valor_reportado: Number(valor_reportado),
        rifa_titulo: reserva.rifa_titulo,
        moneda: reserva.moneda,
        participante: reserva.nombres_completos,
        numeros: nums.map((n) => formatNumero(n.numero, reserva.digitos_formato)),
      },
    };
  });
}

/**
 * Aprueba un pago de forma atómica e idempotente (Sección 6.1 y 10.2).
 */
export async function aprobarPago({ pagoId, adminUserId, referenciaTransferencia, observaciones }) {
  return withTransaction(async (conn) => {
    const [pagos] = await conn.query(
      `SELECT p.id, p.codigo, p.id_reserva, p.estado, p.valor_esperado, p.valor_reportado
       FROM pagos p
       WHERE p.id = ?
       FOR UPDATE`,
      [pagoId]
    );

    if (pagos.length === 0) {
      throw new AppError("Solicitud de pago no encontrada", 404, "PAYMENT_NOT_FOUND");
    }

    const pago = pagos[0];
    if (pago.estado === "APROBADO") {
      throw new AppError("Este pago ya fue aprobado anteriormente", 409, "PAYMENT_ALREADY_APPROVED");
    }
    if (pago.estado !== "PENDIENTE" && pago.estado !== "REQUIERE_REVISION") {
      throw new AppError(
        `No se puede aprobar un pago en estado ${pago.estado}`,
        409,
        "INVALID_PAYMENT_STATE"
      );
    }

    const [reservas] = await conn.query(
      "SELECT id, estado FROM reservas WHERE id = ? FOR UPDATE",
      [pago.id_reserva]
    );
    if (reservas.length === 0) {
      throw new AppError("Reserva asociada no encontrada", 404, "RESERVATION_NOT_FOUND");
    }

    const [rnRows] = await conn.query(
      `SELECT n.id, n.numero, n.estado, n.id_reserva
       FROM reserva_numeros rn
       INNER JOIN numeros n ON n.id = rn.id_numero
       WHERE rn.id_reserva = ?
       ORDER BY n.numero ASC
       FOR UPDATE`,
      [pago.id_reserva]
    );

    const invalidNumbers = rnRows.filter(
      (n) => n.id_reserva !== pago.id_reserva || n.estado !== "PENDIENTE"
    );
    if (rnRows.length === 0 || invalidNumbers.length > 0) {
      throw new AppError(
        "Los números ya no están vinculados a esta reserva o cambiaron de estado",
        409,
        "NUMBERS_STATE_MISMATCH"
      );
    }

    await conn.query(
      `UPDATE pagos
       SET estado = 'APROBADO',
           revisado_por = ?,
           fecha_revision = UTC_TIMESTAMP(),
           referencia_transferencia = COALESCE(NULLIF(?, ''), referencia_transferencia),
           observaciones = COALESCE(NULLIF(?, ''), observaciones)
       WHERE id = ?`,
      [adminUserId, referenciaTransferencia || "", observaciones || "", pago.id]
    );

    await conn.query(
      "UPDATE reservas SET estado = 'COMPLETADA' WHERE id = ?",
      [pago.id_reserva]
    );

    const numIds = rnRows.map((n) => n.id);
    const placeholders = numIds.map(() => "?").join(",");
    await conn.query(
      `UPDATE numeros SET estado = 'VENDIDO' WHERE id IN (${placeholders})`,
      numIds
    );

    await conn.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
       VALUES (?, 'APROBAR_PAGO', 'pagos', ?, ?)`,
      [
        adminUserId,
        pago.id,
        JSON.stringify({
          codigo_pago: pago.codigo,
          id_reserva: pago.id_reserva,
          numeros_vendidos: rnRows.map((n) => n.numero),
        }),
      ]
    );

    return {
      id: pago.id,
      codigo: pago.codigo,
      estado: "APROBADO",
      numeros_vendidos: rnRows.length,
    };
  });
}

/**
 * Rechaza un pago o solicita corrección con prórroga (Sección 6.2).
 */
export async function rechazarPago({
  pagoId,
  adminUserId,
  observaciones,
  accion = "RECHAZADO",
  minutosProrroga = 15,
}) {
  return withTransaction(async (conn) => {
    const [pagos] = await conn.query(
      "SELECT id, codigo, id_reserva, estado FROM pagos WHERE id = ? FOR UPDATE",
      [pagoId]
    );

    if (pagos.length === 0) {
      throw new AppError("Solicitud de pago no encontrada", 404, "PAYMENT_NOT_FOUND");
    }

    const pago = pagos[0];
    if (pago.estado !== "PENDIENTE" && pago.estado !== "REQUIERE_REVISION") {
      throw new AppError(
        `No se puede rechazar un pago en estado ${pago.estado}`,
        409,
        "INVALID_PAYMENT_STATE"
      );
    }

    await conn.query("SELECT id FROM reservas WHERE id = ? FOR UPDATE", [pago.id_reserva]);

    await conn.query(
      `UPDATE pagos
       SET estado = ?,
           observaciones = ?,
           revisado_por = ?,
           fecha_revision = UTC_TIMESTAMP()
       WHERE id = ?`,
      [accion, observaciones, adminUserId, pago.id]
    );

    if (accion === "RECHAZADO") {
      await conn.query(
        "UPDATE reservas SET estado = 'CANCELADA' WHERE id = ?",
        [pago.id_reserva]
      );
      await conn.query(
        "UPDATE numeros SET estado = 'DISPONIBLE', id_reserva = NULL WHERE id_reserva = ? AND estado = 'PENDIENTE'",
        [pago.id_reserva]
      );
    } else {
      await conn.query(
        `UPDATE reservas
         SET estado = 'ACTIVA',
             fecha_vencimiento = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
         WHERE id = ?`,
        [minutosProrroga, pago.id_reserva]
      );
    }

    await conn.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
       VALUES (?, ?, 'pagos', ?, ?)`,
      [
        adminUserId,
        accion === "RECHAZADO" ? "RECHAZAR_PAGO" : "SOLICITAR_CORRECCION_PAGO",
        pago.id,
        JSON.stringify({
          codigo_pago: pago.codigo,
          id_reserva: pago.id_reserva,
          observaciones,
          minutos_prorroga: accion === "REQUIERE_REVISION" ? minutosProrroga : null,
        }),
      ]
    );

    return {
      id: pago.id,
      codigo: pago.codigo,
      estado: accion,
    };
  });
}
