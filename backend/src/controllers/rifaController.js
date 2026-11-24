import { pool, withTransaction } from "../config/database.js";
import { AppError } from "../utils/formatters.js";
import { createRifaSchema, updateRifaEstadoSchema } from "../validators/schemas.js";

export async function listarRifasPublicas(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.titulo, r.slug, r.descripcion, r.categoria, r.imagen_principal,
              r.precio_numero, r.moneda, r.cantidad_numeros, r.numero_inicial, r.numero_final,
              r.digitos_formato, r.fecha_cierre, r.fecha_sorteo, r.estado,
              SUM(CASE WHEN n.estado = 'DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
              SUM(CASE WHEN n.estado = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes,
              SUM(CASE WHEN n.estado = 'VENDIDO' THEN 1 ELSE 0 END) AS vendidos
       FROM rifas r
       INNER JOIN autorizaciones a ON a.id_rifa = r.id AND a.estado = 'APROBADA'
       LEFT JOIN numeros n ON n.id_rifa = r.id
       WHERE r.estado = 'PUBLICADA'
       GROUP BY r.id
       ORDER BY r.fecha_sorteo ASC, r.id DESC`
    );

    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function obtenerRifaPublicaPorSlug(req, res, next) {
  try {
    const { slug } = req.params;
    const [rifas] = await pool.query(
      `SELECT r.id, r.titulo, r.slug, r.descripcion, r.categoria, r.imagen_principal,
              r.precio_numero, r.moneda, r.cantidad_numeros, r.numero_inicial, r.numero_final,
              r.digitos_formato, r.loteria_mecanismo, r.reglamento_url, r.reglamento_version,
              r.fecha_inicio, r.fecha_cierre, r.fecha_sorteo, r.estado, r.reserva_minutos
       FROM rifas r
       INNER JOIN autorizaciones a ON a.id_rifa = r.id AND a.estado = 'APROBADA'
       WHERE r.slug = ? AND r.estado = 'PUBLICADA'
       LIMIT 1`,
      [slug]
    );

    if (rifas.length === 0) {
      throw new AppError("Rifa no encontrada o no publicada", 404, "RAFFLE_NOT_FOUND");
    }

    const rifa = rifas[0];

    const [[imagenes], [premios], [conteos], [autorizacion]] = await Promise.all([
      pool.query(
        "SELECT id, imagen_url, orden, es_principal FROM rifa_imagenes WHERE id_rifa = ? ORDER BY orden ASC",
        [rifa.id]
      ),
      pool.query(
        "SELECT id, nombre, marca, modelo, descripcion, cantidad, valor_comercial, imagen_url FROM premios WHERE id_rifa = ? ORDER BY id ASC",
        [rifa.id]
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
                SUM(estado = 'DISPONIBLE') AS disponibles,
                SUM(estado = 'PENDIENTE') AS pendientes,
                SUM(estado = 'VENDIDO') AS vendidos
         FROM numeros WHERE id_rifa = ?`,
        [rifa.id]
      ),
      pool.query(
        "SELECT operador, entidad_autorizadora, numero_resolucion, fecha_autorizacion FROM autorizaciones WHERE id_rifa = ? AND estado = 'APROBADA' LIMIT 1",
        [rifa.id]
      ),
    ]);

    res.json({
      ok: true,
      data: {
        ...rifa,
        imagenes,
        premios,
        resumen_numeros: conteos[0],
        autorizacion: autorizacion[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listarRifasAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM autorizaciones a WHERE a.id_rifa = r.id AND a.estado = 'APROBADA') AS tiene_autorizacion_aprobada,
              (SELECT COUNT(*) FROM numeros n WHERE n.id_rifa = r.id AND n.estado = 'VENDIDO') AS vendidos,
              (SELECT COUNT(*) FROM numeros n WHERE n.id_rifa = r.id AND n.estado = 'PENDIENTE') AS pendientes
       FROM rifas r
       ORDER BY r.id DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function crearRifaAdmin(req, res, next) {
  try {
    const input = createRifaSchema.parse(req.body);
    if (input.numero_final < input.numero_inicial) {
      throw new AppError("numero_final debe ser mayor o igual a numero_inicial", 400);
    }

    const cantidadNumeros = input.numero_final - input.numero_inicial + 1;
    if (cantidadNumeros > 100000) {
      throw new AppError("El máximo permitido por rifa es de 100.000 números", 400);
    }

    const created = await withTransaction(async (conn) => {
      const [result] = await conn.query(
        `INSERT INTO rifas
         (titulo, slug, descripcion, categoria, precio_numero, moneda, cantidad_numeros,
          numero_inicial, numero_final, digitos_formato, loteria_mecanismo,
          reglamento_url, reglamento_version, fecha_inicio, fecha_cierre, fecha_sorteo,
          estado, reserva_minutos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?)`,
        [
          input.titulo,
          input.slug,
          input.descripcion || null,
          input.categoria || null,
          input.precio_numero,
          input.moneda,
          cantidadNumeros,
          input.numero_inicial,
          input.numero_final,
          input.digitos_formato,
          input.loteria_mecanismo || null,
          input.reglamento_url || null,
          input.reglamento_version || null,
          input.fecha_inicio || null,
          input.fecha_cierre || null,
          input.fecha_sorteo || null,
          input.reserva_minutos,
        ]
      );

      const rifaId = result.insertId;

      // Generar inventario en lotes de 1000
      const batchSize = 1000;
      for (let start = input.numero_inicial; start <= input.numero_final; start += batchSize) {
        const end = Math.min(start + batchSize - 1, input.numero_final);
        const batch = [];
        for (let num = start; num <= end; num += 1) {
          batch.push([rifaId, num, "DISPONIBLE"]);
        }
        await conn.query("INSERT INTO numeros (id_rifa, numero, estado) VALUES ?", [batch]);
      }

      await conn.query(
        `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
         VALUES (?, 'CREAR_RIFA', 'rifas', ?, ?)`,
        [req.user.id, rifaId, JSON.stringify({ titulo: input.titulo, cantidadNumeros })]
      );

      return { id: rifaId, slug: input.slug, cantidad_numeros: cantidadNumeros };
    });

    res.status(201).json({ ok: true, data: created });
  } catch (error) {
    next(error);
  }
}

export async function cambiarEstadoRifaAdmin(req, res, next) {
  try {
    const rifaId = Number(req.params.id);
    const { estado } = updateRifaEstadoSchema.parse(req.body);

    if (estado === "PUBLICADA") {
      // Condición legal (Sección 1): impedir publicación sin autorización aprobada
      const [authRows] = await pool.query(
        "SELECT id FROM autorizaciones WHERE id_rifa = ? AND estado = 'APROBADA' LIMIT 1",
        [rifaId]
      );
      if (authRows.length === 0) {
        throw new AppError(
          "No se puede publicar la rifa hasta registrar y aprobar los soportes legales de autorización.",
          409,
          "AUTHORIZATION_REQUIRED"
        );
      }
    }

    const [result] = await pool.query("UPDATE rifas SET estado = ? WHERE id = ?", [
      estado,
      rifaId,
    ]);
    if (result.affectedRows === 0) {
      throw new AppError("Rifa no encontrada", 404, "RAFFLE_NOT_FOUND");
    }

    await pool.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla_afectada, registro_id, detalle)
       VALUES (?, 'CAMBIAR_ESTADO_RIFA', 'rifas', ?, ?)`,
      [req.user.id, rifaId, JSON.stringify({ estado })]
    );

    res.json({ ok: true, data: { id: rifaId, estado } });
  } catch (error) {
    next(error);
  }
}
