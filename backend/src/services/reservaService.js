import { withTransaction, pool } from "../config/database.js";
import {
  AppError,
  formatNumero,
  generateAccessToken,
  generateCode,
  maskName,
  maskWhatsapp,
  normalizeWhatsapp,
} from "../utils/formatters.js";

/**
 * Crea una reserva de forma atómica ("todo o nada") previniendo deadlocks
 * al ordenar ascendentemente los números antes de SELECT ... FOR UPDATE.
 */
export async function crearReserva({
  id_rifa,
  numeros,
  nombres_completos,
  whatsapp,
  correo,
  acepta_reglamento,
  autoriza_datos,
  ip,
}) {
  const numerosOrdenados = [...new Set(numeros.map(Number))].sort((a, b) => a - b);
  if (numerosOrdenados.length === 0) {
    throw new AppError("Debes seleccionar al menos un número", 400, "EMPTY_NUMBERS");
  }

  const whatsappNormalizado = normalizeWhatsapp(whatsapp);

  return withTransaction(async (conn) => {
    const [rifas] = await conn.query(
      `SELECT id, titulo, precio_numero, moneda, digitos_formato, reglamento_version,
              reserva_minutos, estado, fecha_cierre
       FROM rifas
       WHERE id = ?
       LIMIT 1`,
      [id_rifa]
    );

    if (rifas.length === 0) {
      throw new AppError("La rifa no existe", 404, "RAFFLE_NOT_FOUND");
    }

    const rifa = rifas[0];
    if (rifa.estado !== "PUBLICADA") {
      throw new AppError(
        "Esta rifa no está habilitada para reservas en este momento",
        409,
        "RAFFLE_NOT_PUBLISHED"
      );
    }

    if (rifa.fecha_cierre && new Date(rifa.fecha_cierre) <= new Date()) {
      throw new AppError("El periodo de venta de esta rifa ha cerrado", 409, "RAFFLE_CLOSED");
    }

    // Bloqueo ordenado ascendentemente para prevenir deadlocks
    const placeholders = numerosOrdenados.map(() => "?").join(",");
    const [lockedNumbers] = await conn.query(
      `SELECT id, numero, estado
       FROM numeros
       WHERE id_rifa = ? AND numero IN (${placeholders})
       ORDER BY numero ASC
       FOR UPDATE`,
      [id_rifa, ...numerosOrdenados]
    );

    if (lockedNumbers.length !== numerosOrdenados.length) {
      throw new AppError(
        "Uno o más números seleccionados no pertenecen a esta rifa",
        400,
        "INVALID_NUMBERS"
      );
    }

    const noDisponibles = lockedNumbers
      .filter((row) => row.estado !== "DISPONIBLE")
      .map((row) => formatNumero(row.numero, rifa.digitos_formato));

    if (noDisponibles.length > 0) {
      throw new AppError(
        `Los siguientes números ya no están disponibles: ${noDisponibles.join(", ")}`,
        409,
        "NUMBERS_UNAVAILABLE",
        { noDisponibles }
      );
    }

    // Reutilizar o crear participante por WhatsApp
    let participanteId;
    const [existingPart] = await conn.query(
      "SELECT id FROM participantes WHERE whatsapp = ? LIMIT 1",
      [whatsappNormalizado]
    );

    if (existingPart.length > 0) {
      participanteId = existingPart[0].id;
      await conn.query(
        "UPDATE participantes SET nombres_completos = ?, correo = COALESCE(NULLIF(?, ''), correo) WHERE id = ?",
        [nombres_completos, correo || "", participanteId]
      );
    } else {
      const [partResult] = await conn.query(
        "INSERT INTO participantes (nombres_completos, whatsapp, correo) VALUES (?, ?, NULLIF(?, ''))",
        [nombres_completos, whatsappNormalizado, correo || ""]
      );
      participanteId = partResult.insertId;
    }

    const precioUnitario = Number(rifa.precio_numero);
    const cantidad = lockedNumbers.length;
    const valorTotal = Number((precioUnitario * cantidad).toFixed(2));
    const reservaMinutos = Number(rifa.reserva_minutos || 15);
    const codigo = generateCode("RES");
    const tokenAcceso = generateAccessToken();

    const [resResult] = await conn.query(
      `INSERT INTO reservas
       (codigo, token_acceso, id_rifa, id_participante, cantidad_numeros, valor_total,
        estado, acepta_reglamento, reglamento_version, autoriza_datos,
        consentimiento_fecha, consentimiento_ip, fecha_reserva, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVA', ?, ?, ?, UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
      [
        codigo,
        tokenAcceso,
        id_rifa,
        participanteId,
        cantidad,
        valorTotal,
        acepta_reglamento ? 1 : 0,
        rifa.reglamento_version || null,
        autoriza_datos ? 1 : 0,
        ip || null,
        reservaMinutos,
      ]
    );

    const reservaId = resResult.insertId;

    const rnValues = lockedNumbers.map((row) => [reservaId, row.id, precioUnitario]);
    await conn.query(
      "INSERT INTO reserva_numeros (id_reserva, id_numero, precio) VALUES ?",
      [rnValues]
    );

    const lockedIds = lockedNumbers.map((row) => row.id);
    const idPlaceholders = lockedIds.map(() => "?").join(",");
    await conn.query(
      `UPDATE numeros SET estado = 'PENDIENTE', id_reserva = ? WHERE id IN (${idPlaceholders})`,
      [reservaId, ...lockedIds]
    );

    const [createdRows] = await conn.query(
      "SELECT fecha_reserva, fecha_vencimiento FROM reservas WHERE id = ?",
      [reservaId]
    );

    return {
      id: reservaId,
      codigo,
      token_acceso: tokenAcceso,
      rifa: {
        id: rifa.id,
        titulo: rifa.titulo,
        precio_numero: precioUnitario,
        moneda: rifa.moneda,
        digitos_formato: rifa.digitos_formato,
      },
      cantidad_numeros: cantidad,
      valor_total: valorTotal,
      numeros: lockedNumbers.map((row) => formatNumero(row.numero, rifa.digitos_formato)),
      estado: "ACTIVA",
      fecha_reserva: createdRows[0].fecha_reserva,
      fecha_vencimiento: createdRows[0].fecha_vencimiento,
    };
  });
}

/**
 * Consulta una reserva pública mediante su token_acceso de alta entropía
 * enmascarando datos personales del participante (anti-IDOR).
 */
export async function obtenerReservaPorToken(tokenAcceso) {
  const [rows] = await pool.query(
    `SELECT r.id, r.codigo, r.token_acceso, r.cantidad_numeros, r.valor_total,
            r.estado, r.fecha_reserva, r.fecha_vencimiento,
            rf.id AS id_rifa, rf.titulo AS rifa_titulo, rf.slug AS rifa_slug,
            rf.precio_numero, rf.moneda, rf.digitos_formato,
            p.nombres_completos, p.whatsapp
     FROM reservas r
     INNER JOIN rifas rf ON rf.id = r.id_rifa
     INNER JOIN participantes p ON p.id = r.id_participante
     WHERE r.token_acceso = ?
     LIMIT 1`,
    [tokenAcceso]
  );

  if (rows.length === 0) {
    throw new AppError("Reserva no encontrada", 404, "RESERVATION_NOT_FOUND");
  }

  const reserva = rows[0];

  const [nums] = await pool.query(
    `SELECT n.numero, rn.precio
     FROM reserva_numeros rn
     INNER JOIN numeros n ON n.id = rn.id_numero
     WHERE rn.id_reserva = ?
     ORDER BY n.numero ASC`,
    [reserva.id]
  );

  const [pagos] = await pool.query(
    `SELECT codigo, medio_pago, valor_reportado, estado, observaciones, fecha_solicitud
     FROM pagos
     WHERE id_reserva = ?
     ORDER BY id DESC
     LIMIT 1`,
    [reserva.id]
  );

  return {
    codigo: reserva.codigo,
    estado: reserva.estado,
    cantidad_numeros: reserva.cantidad_numeros,
    valor_total: Number(reserva.valor_total),
    fecha_reserva: reserva.fecha_reserva,
    fecha_vencimiento: reserva.fecha_vencimiento,
    rifa: {
      id: reserva.id_rifa,
      titulo: reserva.rifa_titulo,
      slug: reserva.rifa_slug,
      precio_numero: Number(reserva.precio_numero),
      moneda: reserva.moneda,
      digitos_formato: reserva.digitos_formato,
    },
    participante: {
      nombres_enmascarado: maskName(reserva.nombres_completos),
      whatsapp_enmascarado: maskWhatsapp(reserva.whatsapp),
    },
    numeros: nums.map((n) => formatNumero(n.numero, reserva.digitos_formato)),
    ultimo_pago: pagos[0] || null,
  };
}

/**
 * Job transaccional que libera reservas ACTIVAS vencidas sin pagos pendientes.
 * Utiliza FOR UPDATE SKIP LOCKED para evitar colisiones con carga simultánea de comprobante.
 */
export async function liberarReservasExpiradas() {
  return withTransaction(async (conn) => {
    const [expired] = await conn.query(
      `SELECT r.id
       FROM reservas r
       WHERE r.estado = 'ACTIVA'
         AND r.fecha_vencimiento <= UTC_TIMESTAMP()
         AND NOT EXISTS (
           SELECT 1 FROM pagos p
           WHERE p.id_reserva = r.id
             AND p.estado IN ('PENDIENTE', 'APROBADO')
         )
       ORDER BY r.id ASC
       LIMIT 100
       FOR UPDATE SKIP LOCKED`
    );

    if (expired.length === 0) return { expiradas: 0, numerosLiberados: 0 };

    const ids = expired.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");

    await conn.query(
      `UPDATE reservas SET estado = 'EXPIRADA' WHERE id IN (${placeholders})`,
      ids
    );

    const [numResult] = await conn.query(
      `UPDATE numeros
       SET estado = 'DISPONIBLE', id_reserva = NULL
       WHERE id_reserva IN (${placeholders}) AND estado = 'PENDIENTE'`,
      ids
    );

    return {
      expiradas: ids.length,
      numerosLiberados: numResult.affectedRows,
    };
  });
}
