import crypto from "node:crypto";
import { Router } from "express";
import publicRoutes from "./publicRoutes.js";
import adminRoutes from "./adminRoutes.js";
import { env } from "../config/env.js";
import { testDatabaseConnection } from "../config/database.js";
import { liberarReservasExpiradas } from "../services/reservaService.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    const dbOk = await testDatabaseConnection();
    res.json({ ok: true, status: "healthy", database: dbOk ? "up" : "down" });
  } catch {
    res.status(503).json({ ok: false, status: "degraded", database: "down" });
  }
});

// Endpoint protegido para ejecutar expiración desde Cron Jobs externos de Hostinger hPanel
router.post("/internal/cron/liberar-reservas", async (req, res, next) => {
  try {
    if (!env.cronSecret) {
      return res.status(404).json({ ok: false, code: "NOT_CONFIGURED" });
    }
    const provided = String(req.headers["x-cron-secret"] || "");
    const a = Buffer.from(provided);
    const b = Buffer.from(env.cronSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED" });
    }
    const result = await liberarReservasExpiradas();
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.use("/", publicRoutes);
router.use("/admin", adminRoutes);

export default router;
