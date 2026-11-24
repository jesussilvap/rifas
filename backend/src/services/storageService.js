import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const PUBLIC_ROOT = path.join(BACKEND_ROOT, "public_uploads");
const PRIVATE_ROOT = path.join(BACKEND_ROOT, "private_uploads");

const SAFE_FOLDERS = {
  public: new Set(["rifas", "premios", "pagos_qr"]),
  private: new Set(["comprobantes", "autorizaciones", "actas_sorteo"]),
};

function resolveBase(visibility, folder) {
  if (!SAFE_FOLDERS[visibility]?.has(folder)) {
    throw new Error(`Carpeta de almacenamiento no permitida: ${visibility}/${folder}`);
  }
  return visibility === "public"
    ? path.join(PUBLIC_ROOT, folder)
    : path.join(PRIVATE_ROOT, folder);
}

/**
 * Servicio de almacenamiento desacoplado (actualmente disco local;
 * preparado para cambiar a S3 / Cloudflare R2 sin modificar controladores).
 */
export const storageService = {
  async saveBuffer({ visibility, folder, buffer, ext = "webp" }) {
    const targetDir = resolveBase(visibility, folder);
    await fs.mkdir(targetDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.${ext}`;
    const fullPath = path.join(targetDir, filename);
    await fs.writeFile(fullPath, buffer);
    return {
      key: `${folder}/${filename}`,
      publicUrl: visibility === "public" ? `/uploads/${folder}/${filename}` : null,
    };
  },

  resolvePrivatePath(relativeKey) {
    const normalized = path.normalize(relativeKey).replace(/^(\.\.(\/|\\|$))+/, "");
    const resolved = path.resolve(PRIVATE_ROOT, normalized);
    if (!resolved.startsWith(PRIVATE_ROOT)) {
      throw new Error("Ruta de archivo privada inválida");
    }
    return resolved;
  },
};
