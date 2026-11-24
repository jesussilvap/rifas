import bcrypt from "bcrypt";
import { pool, withTransaction } from "../config/database.js";

async function seedDemo() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@devsoluciones.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123456!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO usuarios_admin (nombre, correo, password_hash, rol, estado)
       VALUES (?, ?, ?, 'SUPER_ADMIN', 'ACTIVO')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
      ["Super Administrador", adminEmail, passwordHash]
    );

    const [configRows] = await conn.query(
      "SELECT id FROM configuracion_general LIMIT 1"
    );
    if (configRows.length === 0) {
      await conn.query(
        `INSERT INTO configuracion_general
         (whatsapp_comprobantes, whatsapp_soporte, instrucciones_whatsapp, plantilla_mensaje_whatsapp, horario_atencion, reserva_minutos_defecto)
         VALUES (?, ?, ?, ?, ?, 15)`,
        [
          "573001234567",
          "573001234567",
          "Tu solicitud fue registrada y quedó pendiente de verificación. Envía también la imagen del comprobante al número de WhatsApp configurado.",
          "Hola, he realizado el pago de mi participación.\n\nRifa: [NOMBRE DE LA RIFA]\nNombre: [NOMBRE DEL PARTICIPANTE]\nNúmeros: [NÚMEROS]\nValor: [TOTAL]\nCódigo de solicitud: [CÓDIGO]",
          "Lunes a sábado, 8:00 a.m. - 8:00 p.m. (Hora Colombia)",
        ]
      );
    }

    await conn.query(
      `INSERT INTO configuracion_pagos (medio, titular, numero_celular, entidad, llave, activo)
       VALUES
         ('NEQUI', 'DevSoluciones Demo', '3001234567', 'Nequi', NULL, TRUE),
         ('BREB', 'DevSoluciones Demo', NULL, 'Bre-B', '@devsoluciones', TRUE)
       ON DUPLICATE KEY UPDATE titular = VALUES(titular)`
    );

    const [existingRifa] = await conn.query(
      "SELECT id FROM rifas WHERE slug = ? LIMIT 1",
      ["rifa-demo-tecnologia-2026"]
    );

    if (existingRifa.length === 0) {
      const [rifaResult] = await conn.query(
        `INSERT INTO rifas
         (titulo, slug, descripcion, categoria, precio_numero, moneda, cantidad_numeros, numero_inicial, numero_final, digitos_formato, loteria_mecanismo, reglamento_version, fecha_inicio, fecha_cierre, fecha_sorteo, estado, reserva_minutos)
         VALUES (?, ?, ?, ?, ?, 'COP', 100, 0, 99, 2, ?, 'v1.0-demo', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 31 DAY), 'PUBLICADA', 15)`,
        [
          "Rifa Demo Tecnología 2026 (Pruebas)",
          "rifa-demo-tecnologia-2026",
          "Rifa ficticia exclusiva para pruebas del entorno de desarrollo. No representa comercialización real.",
          "Tecnología",
          20000,
          "Lotería de prueba (últimas 2 cifras)",
        ]
      );
      const rifaId = rifaResult.insertId;

      await conn.query(
        `INSERT INTO autorizaciones (id_rifa, operador, entidad_autorizadora, numero_resolucion, fecha_autorizacion, estado)
         VALUES (?, 'DevSoluciones (Entorno de Pruebas)', 'Validación interna MVP', 'DEMO-001', CURDATE(), 'APROBADA')`,
        [rifaId]
      );

      await conn.query(
        `INSERT INTO premios (id_rifa, nombre, marca, modelo, descripcion, cantidad, valor_comercial)
         VALUES (?, 'Combo Tecnológico Demo', 'DevSoluciones', 'Edición 2026', 'Premio ficticio para validación funcional del MVP.', 1, 1500000)`,
        [rifaId]
      );

      const values = [];
      for (let num = 0; num <= 99; num += 1) {
        values.push([rifaId, num, "DISPONIBLE"]);
      }
      await conn.query(
        "INSERT INTO numeros (id_rifa, numero, estado) VALUES ?",
        [values]
      );
    }
  });

  console.log(`Seed demo completado. Usuario admin: ${adminEmail}`);
  await pool.end();
}

seedDemo().catch((error) => {
  console.error("Error ejecutando seed demo:", error);
  process.exit(1);
});
