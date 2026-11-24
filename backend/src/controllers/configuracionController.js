import { pool } from "../config/database.js";
import {
  updateConfigGeneralSchema,
  updateConfigPagosSchema,
} from "../validators/schemas.js";

export async function obtenerConfiguracionPublica(req, res, next) {
  try {
    const [[pagos], [general]] = await Promise.all([
      pool.query(
        "SELECT medio, titular, numero_celular, entidad, llave, imagen_url FROM configuracion_pagos WHERE activo = TRUE ORDER BY id ASC"
      ),
      pool.query(
        "SELECT whatsapp_comprobantes, whatsapp_soporte, instrucciones_whatsapp, plantilla_mensaje_whatsapp, horario_atencion, reserva_minutos_defecto FROM configuracion_general ORDER BY id ASC LIMIT 1"
      ),
    ]);

    res.json({
      ok: true,
      data: {
        medios_pago: pagos,
        general: general[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function actualizarConfiguracionPagosAdmin(req, res, next) {
  try {
    const input = updateConfigPagosSchema.parse(req.body);

    await pool.query(
      `INSERT INTO configuracion_pagos
       (medio, titular, numero_celular, entidad, llave, imagen_url, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         titular = VALUES(titular),
         numero_celular = VALUES(numero_celular),
         entidad = VALUES(entidad),
         llave = VALUES(llave),
         imagen_url = VALUES(imagen_url),
         activo = VALUES(activo)`,
      [
        input.medio,
        input.titular || null,
        input.numero_celular || null,
        input.entidad || null,
        input.llave || null,
        input.imagen_url || null,
        input.activo ? 1 : 0,
      ]
    );

    await pool.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, detalle)
       VALUES (?, 'ACTUALIZAR_CONFIG_PAGOS', 'configuracion_pagos', ?)`,
      [req.user.id, JSON.stringify({ medio: input.medio, activo: input.activo })]
    );

    res.json({ ok: true, data: input });
  } catch (error) {
    next(error);
  }
}

export async function actualizarConfiguracionGeneralAdmin(req, res, next) {
  try {
    const input = updateConfigGeneralSchema.parse(req.body);
    const [existing] = await pool.query(
      "SELECT id FROM configuracion_general ORDER BY id ASC LIMIT 1"
    );

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO configuracion_general
         (whatsapp_comprobantes, whatsapp_soporte, instrucciones_whatsapp, plantilla_mensaje_whatsapp, horario_atencion, reserva_minutos_defecto, actualizado_por)
         VALUES (?, NULLIF(?, ''), ?, ?, ?, ?, ?)`,
        [
          input.whatsapp_comprobantes,
          input.whatsapp_soporte || "",
          input.instrucciones_whatsapp || null,
          input.plantilla_mensaje_whatsapp || null,
          input.horario_atencion || null,
          input.reserva_minutos_defecto,
          req.user.id,
        ]
      );
    } else {
      await pool.query(
        `UPDATE configuracion_general
         SET whatsapp_comprobantes = ?,
             whatsapp_soporte = NULLIF(?, ''),
             instrucciones_whatsapp = ?,
             plantilla_mensaje_whatsapp = ?,
             horario_atencion = ?,
             reserva_minutos_defecto = ?,
             actualizado_por = ?
         WHERE id = ?`,
        [
          input.whatsapp_comprobantes,
          input.whatsapp_soporte || "",
          input.instrucciones_whatsapp || null,
          input.plantilla_mensaje_whatsapp || null,
          input.horario_atencion || null,
          input.reserva_minutos_defecto,
          req.user.id,
          existing[0].id,
        ]
      );
    }

    await pool.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, detalle)
       VALUES (?, 'ACTUALIZAR_CONFIG_GENERAL', 'configuracion_general', ?)`,
      [req.user.id, JSON.stringify({ whatsapp_comprobantes: input.whatsapp_comprobantes })]
    );

    res.json({ ok: true, data: input });
  } catch (error) {
    next(error);
  }
}
