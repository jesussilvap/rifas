import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { pool } from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const LEGACY_PUBLIC_ROOT = path.join(BACKEND_ROOT, "public_uploads");
const LEGACY_PRIVATE_ROOT = path.join(BACKEND_ROOT, "private_uploads");

const SAFE_FOLDERS = {
  public: new Set(["rifas", "premios", "pagos_qr"]),
  private: new Set(["comprobantes", "autorizaciones", "actas_sorteo"]),
};

let tableReadyPromise = null;

function ensureTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = pool
      .query(
        `CREATE TABLE IF NOT EXISTS archivos_almacenados (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          clave VARCHAR(255) NOT NULL UNIQUE,
          visibilidad ENUM('public','private') NOT NULL,
          mime VARCHAR(100) NOT NULL DEFAULT 'image/webp',
          tamano_bytes INT UNSIGNED NOT NULL,
          contenido MEDIUMBLOB NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_archivos_vis_clave (visibilidad, clave)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      )
      .catch((err) => {
        tableReadyPromise = null;
        throw err;
      });
  }
  return tableReadyPromise;
}

function assertSafeFolder(visibility, folder) {
  if (!SAFE_FOLDERS[visibility]?.has(folder)) {
    throw new Error(`Carpeta de almacenamiento no permitida: ${visibility}/${folder}`);
  }
}

function safeJoin(root, relativeKey) {
  const normalized = path
    .normalize(String(relativeKey || ""))
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const resolved = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!resolved.startsWith(rootWithSep)) {
    throw new Error("Ruta de archivo inválida");
  }
  return resolved;
}

function mimeFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "image/webp";
}

/**
 * Servicio de almacenamiento persistente en tabla dedicada MySQL (`archivos_almacenados`)
 * para sobrevivir a contenedores efímeros y Redeploys en Hostinger Node.js Web Apps,
 * con respaldo de lectura al disco local para archivos previos.
 */
export const storageService = {
  async saveBuffer({ visibility, folder, buffer, mime = "image/webp", ext = "webp" }) {
    assertSafeFolder(visibility, folder);
    await ensureTable();

    const filename = `${crypto.randomUUID()}.${ext}`;
    const key = `${folder}/${filename}`;

    await pool.query(
      `INSERT INTO archivos_almacenados (clave, visibilidad, mime, tamano_bytes, contenido)
       VALUES (?, ?, ?, ?, ?)`,
      [key, visibility, mime, buffer.length, buffer]
    );

    return {
      key,
      publicUrl: visibility === "public" ? `/uploads/${folder}/${filename}` : null,
    };
  },

  async readFile({ visibility, key }) {
    const cleanKey = String(key || "")
      .replace(/^\/+/, "")
      .replace(/\.\./g, "");
    if (!cleanKey) return null;

    const folder = cleanKey.split("/")[0];
    assertSafeFolder(visibility, folder);

    await ensureTable();
    const [rows] = await pool.query(
      `SELECT mime, contenido FROM archivos_almacenados
       WHERE clave = ? AND visibilidad = ?
       LIMIT 1`,
      [cleanKey, visibility]
    );

    if (rows.length > 0 && rows[0].contenido) {
      return {
        buffer: Buffer.isBuffer(rows[0].contenido)
          ? rows[0].contenido
          : Buffer.from(rows[0].contenido),
        mime: rows[0].mime || "image/webp",
      };
    }

    // Respaldo de lectura en disco local si existiera un archivo legado
    const legacyRoot = visibility === "public" ? LEGACY_PUBLIC_ROOT : LEGACY_PRIVATE_ROOT;
    const legacyPath = safeJoin(legacyRoot, cleanKey);
    if (fs.existsSync(legacyPath)) {
      const buffer = await fsp.readFile(legacyPath);
      return { buffer, mime: mimeFromExt(legacyPath) };
    }

    return null;
  },
};
