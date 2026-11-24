import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const LEGACY_PUBLIC_ROOT = path.join(BACKEND_ROOT, "public_uploads");
const LEGACY_PRIVATE_ROOT = path.join(BACKEND_ROOT, "private_uploads");

function resolveStorageRoots() {
  if (process.env.STORAGE_ROOT) {
    const base = path.resolve(process.env.STORAGE_ROOT);
    return {
      publicRoot: path.join(base, "public_uploads"),
      privateRoot: path.join(base, "private_uploads"),
    };
  }

  // En Hostinger Node.js Web Apps el código corre dentro de .../.builds/...
  // Guardar archivos fuera de .builds/ permite que sobrevivan a cada Redeploy.
  const buildsMarker = `${path.sep}.builds${path.sep}`;
  const markerIdx = BACKEND_ROOT.indexOf(buildsMarker);
  if (markerIdx !== -1) {
    const persistentBase = path.join(
      BACKEND_ROOT.slice(0, markerIdx),
      "rifas_storage"
    );
    return {
      publicRoot: path.join(persistentBase, "public_uploads"),
      privateRoot: path.join(persistentBase, "private_uploads"),
    };
  }

  return {
    publicRoot: LEGACY_PUBLIC_ROOT,
    privateRoot: LEGACY_PRIVATE_ROOT,
  };
}

const { publicRoot: PUBLIC_ROOT, privateRoot: PRIVATE_ROOT } = resolveStorageRoots();

const SAFE_FOLDERS = {
  public: new Set(["rifas", "premios", "pagos_qr"]),
  private: new Set(["comprobantes", "autorizaciones", "actas_sorteo"]),
};

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

/**
 * Servicio de almacenamiento desacoplado:
 * - En Hostinger guarda fuera de /.builds/ para persistir entre despliegues.
 * - Si el hosting restringe escritura fuera del directorio de la app, cae de forma segura a backend/*_uploads.
 */
export const storageService = {
  getPublicRoots() {
    return PUBLIC_ROOT === LEGACY_PUBLIC_ROOT
      ? [PUBLIC_ROOT]
      : [PUBLIC_ROOT, LEGACY_PUBLIC_ROOT];
  },

  async saveBuffer({ visibility, folder, buffer, ext = "webp" }) {
    assertSafeFolder(visibility, folder);
    const primaryRoot = visibility === "public" ? PUBLIC_ROOT : PRIVATE_ROOT;
    const fallbackRoot = visibility === "public" ? LEGACY_PUBLIC_ROOT : LEGACY_PRIVATE_ROOT;
    const filename = `${crypto.randomUUID()}.${ext}`;

    const tryWrite = async (root) => {
      const targetDir = path.join(root, folder);
      await fsp.mkdir(targetDir, { recursive: true });
      const fullPath = path.join(targetDir, filename);
      await fsp.writeFile(fullPath, buffer);
    };

    try {
      await tryWrite(primaryRoot);
    } catch {
      if (primaryRoot === fallbackRoot) throw new Error("No se pudo escribir el archivo");
      await tryWrite(fallbackRoot);
    }

    return {
      key: `${folder}/${filename}`,
      publicUrl: visibility === "public" ? `/uploads/${folder}/${filename}` : null,
    };
  },

  resolvePrivatePath(relativeKey) {
    const primaryPath = safeJoin(PRIVATE_ROOT, relativeKey);
    if (fs.existsSync(primaryPath)) return primaryPath;

    if (PRIVATE_ROOT !== LEGACY_PRIVATE_ROOT) {
      const legacyPath = safeJoin(LEGACY_PRIVATE_ROOT, relativeKey);
      if (fs.existsSync(legacyPath)) return legacyPath;
    }

    return primaryPath;
  },

  resolvePublicPath(folder, filename) {
    assertSafeFolder("public", folder);
    const safeName = path.basename(String(filename || ""));
    if (!safeName || safeName.startsWith(".")) {
      throw new Error("Nombre de archivo inválido");
    }
    const relativeKey = path.join(folder, safeName);
    const primaryPath = safeJoin(PUBLIC_ROOT, relativeKey);
    if (fs.existsSync(primaryPath)) return primaryPath;

    if (PUBLIC_ROOT !== LEGACY_PUBLIC_ROOT) {
      const legacyPath = safeJoin(LEGACY_PUBLIC_ROOT, relativeKey);
      if (fs.existsSync(legacyPath)) return legacyPath;
    }

    return null;
  },
};
