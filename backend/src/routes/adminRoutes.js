import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRoles } from "../middlewares/roleMiddleware.js";
import { csrfMiddleware } from "../middlewares/csrfMiddleware.js";
import {
  dashboardAdmin,
  listarAuditoriaAdmin,
  listarParticipantesAdmin,
  loginAdmin,
  logoutAdmin,
  meAdmin,
} from "../controllers/adminController.js";
import {
  actualizarRifaAdmin,
  cambiarEstadoRifaAdmin,
  crearPremioAdmin,
  crearRifaAdmin,
  listarRifasAdmin,
  registrarAutorizacionAdmin,
  subirImagenRifaAdmin,
} from "../controllers/rifaController.js";
import { uploadSingleImage } from "../middlewares/uploadMiddleware.js";
import {
  detalleNumeroAdmin,
  exportarInventarioCsvAdmin,
  liberarNumerosManualAdmin,
  listarNumerosAdmin,
} from "../controllers/numeroController.js";
import {
  listarSorteosAdmin,
  registrarSorteoAdmin,
  servirEvidenciaSorteoAdmin,
  subirEvidenciaSorteoAdmin,
} from "../controllers/sorteoController.js";
import {
  aprobarPagoAdmin,
  listarPagosAdmin,
  rechazarPagoAdmin,
  servirComprobantePrivadoAdmin,
} from "../controllers/pagoController.js";
import {
  actualizarConfiguracionGeneralAdmin,
  actualizarConfiguracionPagosAdmin,
} from "../controllers/configuracionController.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    code: "LOGIN_RATE_LIMITED",
    message: "Demasiados intentos de inicio de sesión. Espera 15 minutos.",
  },
});

router.post("/auth/login", loginLimiter, loginAdmin);

// Todas las rutas administrativas siguientes requieren sesión válida y CSRF
router.use(authMiddleware, csrfMiddleware);

router.post("/auth/logout", logoutAdmin);
router.get("/auth/me", meAdmin);
router.get("/dashboard", requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"), dashboardAdmin);

router.get("/rifas", requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"), listarRifasAdmin);
router.post("/rifas", requireRoles("SUPER_ADMIN", "ADMIN"), crearRifaAdmin);
router.put("/rifas/:id", requireRoles("SUPER_ADMIN", "ADMIN"), actualizarRifaAdmin);
router.post(
  "/rifas/:id/imagen",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  ...uploadSingleImage("imagen"),
  subirImagenRifaAdmin
);
router.post(
  "/rifas/:id/premios",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  crearPremioAdmin
);
router.post(
  "/rifas/:id/autorizaciones",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  registrarAutorizacionAdmin
);
router.patch(
  "/rifas/:id/estado",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  cambiarEstadoRifaAdmin
);

router.get(
  "/rifas/:id/numeros",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  listarNumerosAdmin
);
router.get(
  "/rifas/:id/numeros/exportar",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  exportarInventarioCsvAdmin
);
router.get(
  "/rifas/:id/numeros/:numero",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  detalleNumeroAdmin
);
router.post(
  "/numeros/liberar",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  liberarNumerosManualAdmin
);

router.get("/pagos", requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"), listarPagosAdmin);
router.get(
  "/pagos/:id/comprobante",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  servirComprobantePrivadoAdmin
);
router.patch(
  "/pagos/:id/aprobar",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  aprobarPagoAdmin
);
router.patch(
  "/pagos/:id/rechazar",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  rechazarPagoAdmin
);

router.get(
  "/sorteos",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  listarSorteosAdmin
);
router.post(
  "/rifas/:id/sorteo",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  registrarSorteoAdmin
);
router.post(
  "/sorteos/:id/evidencia",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  ...uploadSingleImage("evidencia"),
  subirEvidenciaSorteoAdmin
);
router.get(
  "/sorteos/:id/evidencia",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  servirEvidenciaSorteoAdmin
);

router.get(
  "/participantes",
  requireRoles("SUPER_ADMIN", "ADMIN", "OPERADOR"),
  listarParticipantesAdmin
);
router.get("/auditoria", requireRoles("SUPER_ADMIN", "ADMIN"), listarAuditoriaAdmin);

router.put(
  "/configuracion/pagos",
  requireRoles("SUPER_ADMIN"),
  actualizarConfiguracionPagosAdmin
);
router.put(
  "/configuracion/general",
  requireRoles("SUPER_ADMIN"),
  actualizarConfiguracionGeneralAdmin
);

export default router;
