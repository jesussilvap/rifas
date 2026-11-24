import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { env } from "../config/env.js";
import { AppError } from "../utils/formatters.js";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.uploadMaxMb * 1024 * 1024,
    files: 1,
  },
});

export function uploadSingleImage(fieldName = "comprobante") {
  return [
    (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new AppError(
                `El archivo supera el tamaño máximo de ${env.uploadMaxMb} MB`,
                413,
                "FILE_TOO_LARGE"
              )
            );
          }
          return next(new AppError("Error al recibir el archivo", 400, "UPLOAD_ERROR"));
        }
        if (err) return next(err);
        return next();
      });
    },
    async (req, res, next) => {
      try {
        if (!req.file) return next();

        const detected = await fileTypeFromBuffer(req.file.buffer);
        if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
          return next(
            new AppError(
              "Formato de imagen no permitido. Usa JPG, PNG o WEBP válidos.",
              400,
              "INVALID_IMAGE_TYPE"
            )
          );
        }

        // Re-procesar imagen con sharp para validar integridad y eliminar metadatos EXIF
        const cleanBuffer = await sharp(req.file.buffer)
          .rotate()
          .webp({ quality: 85 })
          .toBuffer();

        req.validatedImage = {
          buffer: cleanBuffer,
          mime: "image/webp",
          ext: "webp",
          size: cleanBuffer.length,
          originalName: req.file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(0, 200),
        };

        return next();
      } catch {
        return next(
          new AppError(
            "El archivo cargado no es una imagen válida o está dañado.",
            400,
            "CORRUPT_IMAGE"
          )
        );
      }
    },
  ];
}
