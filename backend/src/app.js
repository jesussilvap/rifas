import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./utils/logger.js";
import apiRoutes from "./routes/index.js";
import { storageService } from "./services/storageService.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/errorMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDir = path.resolve(__dirname, "../../frontend/dist");

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "blob:", "https:"],
        },
      },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origen no permitido por CORS"));
      },
      credentials: true,
    })
  );

  app.use(httpLogger);
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Solo los archivos explícitamente públicos (catálogo/premios/QR) se entregan desde almacenamiento persistente.
  app.get("/uploads/:folder/:filename", async (req, res) => {
    try {
      const { folder, filename } = req.params;
      const safeName = path.basename(String(filename || ""));
      if (!safeName || safeName.startsWith(".")) {
        return res.status(404).end();
      }
      const file = await storageService.readFile({
        visibility: "public",
        key: `${folder}/${safeName}`,
      });
      if (!file) {
        return res.status(404).end();
      }
      res.setHeader("Content-Type", file.mime || "image/webp");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", env.isProd ? "public, max-age=604800" : "no-cache");
      return res.send(file.buffer);
    } catch {
      return res.status(404).end();
    }
  });

  app.use("/api", apiRoutes);

  // En producción (ej. Hostinger Business Node.js Web App), servir frontend/dist bajo el mismo dominio
  if (fs.existsSync(path.join(frontendDistDir, "index.html"))) {
    app.use(
      express.static(frontendDistDir, {
        maxAge: env.isProd ? "7d" : 0,
        index: false,
      })
    );

    app.get(/^\/(?!api|uploads).*/, (req, res, next) => {
      const indexPath = path.join(frontendDistDir, "index.html");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      const stream = fs.createReadStream(indexPath);
      stream.on("error", (err) => next(err));
      stream.pipe(res);
    });
  }

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
