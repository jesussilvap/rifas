import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  listarRifasPublicas,
  obtenerRifaPublicaPorSlug,
} from "../controllers/rifaController.js";
import { listarNumerosPorRifa } from "../controllers/numeroController.js";
import {
  consultarReservaPublica,
  crearReservaPublica,
} from "../controllers/reservaController.js";
import { reportarPagoPublico } from "../controllers/pagoController.js";
import { obtenerConfiguracionPublica } from "../controllers/configuracionController.js";
import { uploadSingleImage } from "../middlewares/uploadMiddleware.js";

const router = Router();

const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    code: "RATE_LIMITED",
    message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
  },
});

router.get("/rifas", listarRifasPublicas);
router.get("/rifas/:slug", obtenerRifaPublicaPorSlug);
router.get("/rifas/:id/numeros", listarNumerosPorRifa);
router.get("/configuracion/publica", obtenerConfiguracionPublica);

router.post("/reservas", publicWriteLimiter, crearReservaPublica);
router.get("/reservas/:token", consultarReservaPublica);
router.post(
  "/pagos",
  publicWriteLimiter,
  ...uploadSingleImage("comprobante"),
  reportarPagoPublico
);

export default router;
