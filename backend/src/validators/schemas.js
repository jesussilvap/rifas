import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(6, "Contraseña inválida"),
});

export const createReservaSchema = z.object({
  id_rifa: z.coerce.number().int().positive(),
  numeros: z
    .array(z.coerce.number().int().min(0))
    .min(1, "Debes seleccionar al menos un número")
    .max(50, "Máximo 50 números por reserva"),
  nombres_completos: z
    .string()
    .trim()
    .min(3, "Ingresa tus nombres completos")
    .max(200),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-()]{10,20}$/, "Número de WhatsApp inválido"),
  correo: z
    .string()
    .trim()
    .email("Correo electrónico inválido")
    .optional()
    .or(z.literal("")),
  acepta_reglamento: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el reglamento" }),
  }),
  autoriza_datos: z.literal(true, {
    errorMap: () => ({
      message: "Debes autorizar el tratamiento de datos personales",
    }),
  }),
});

export const reportPagoSchema = z.object({
  token_acceso: z.string().trim().length(64, "Token de reserva inválido"),
  medio_pago: z.enum(["NEQUI", "BREB"]),
  valor_reportado: z.coerce.number().positive("Valor reportado inválido"),
  referencia_transferencia: z.string().trim().max(150).optional().or(z.literal("")),
});

export const rechazarPagoSchema = z.object({
  observaciones: z
    .string()
    .trim()
    .min(5, "El motivo del rechazo es obligatorio (mínimo 5 caracteres)")
    .max(1000),
  accion: z.enum(["RECHAZADO", "REQUIERE_REVISION"]).default("RECHAZADO"),
  minutos_prorroga: z.coerce.number().int().min(5).max(120).optional().default(15),
});

export const createRifaSchema = z.object({
  titulo: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(220)
    .regex(/^[a-z0-9-]+$/, "El slug solo permite minúsculas, números y guiones"),
  descripcion: z.string().trim().optional().nullable(),
  categoria: z.string().trim().max(100).optional().nullable(),
  precio_numero: z.coerce.number().positive(),
  moneda: z.string().trim().length(3).default("COP"),
  numero_inicial: z.coerce.number().int().min(0).default(0),
  numero_final: z.coerce.number().int().min(1),
  digitos_formato: z.coerce.number().int().min(2).max(6).default(3),
  loteria_mecanismo: z.string().trim().max(200).optional().nullable(),
  reglamento_url: z.string().trim().max(500).optional().nullable(),
  reglamento_version: z.string().trim().max(50).optional().nullable(),
  fecha_inicio: z.string().optional().nullable(),
  fecha_cierre: z.string().optional().nullable(),
  fecha_sorteo: z.string().optional().nullable(),
  reserva_minutos: z.coerce.number().int().min(5).max(120).default(15),
});

export const updateRifaEstadoSchema = z.object({
  estado: z.enum([
    "BORRADOR",
    "EN_REVISION",
    "PUBLICADA",
    "PAUSADA",
    "CERRADA",
    "FINALIZADA",
    "CANCELADA",
  ]),
});

export const updateRifaSchema = z.object({
  titulo: z.string().trim().min(3).max(200).optional(),
  descripcion: z.string().trim().optional().nullable(),
  categoria: z.string().trim().max(100).optional().nullable(),
  precio_numero: z.coerce.number().positive().optional(),
  loteria_mecanismo: z.string().trim().max(200).optional().nullable(),
  reglamento_url: z.string().trim().max(500).optional().nullable(),
  reglamento_version: z.string().trim().max(50).optional().nullable(),
  fecha_inicio: z.string().optional().nullable(),
  fecha_cierre: z.string().optional().nullable(),
  fecha_sorteo: z.string().optional().nullable(),
  reserva_minutos: z.coerce.number().int().min(5).max(120).optional(),
});

export const createPremioSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre del premio obligatorio").max(200),
  marca: z.string().trim().max(100).optional().nullable(),
  modelo: z.string().trim().max(150).optional().nullable(),
  descripcion: z.string().trim().max(2000).optional().nullable(),
  cantidad: z.coerce.number().int().min(1).default(1),
  valor_comercial: z.coerce.number().nonnegative().optional().nullable(),
});

export const upsertAutorizacionSchema = z.object({
  operador: z.string().trim().min(2, "Operador obligatorio").max(200),
  entidad_autorizadora: z.string().trim().min(2, "Entidad autorizadora obligatoria").max(200),
  numero_resolucion: z.string().trim().min(2, "Número de resolución obligatorio").max(100),
  fecha_autorizacion: z.string().trim().optional().nullable(),
  documento_url: z.string().trim().max(500).optional().nullable(),
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).default("APROBADA"),
});

export const updateConfigPagosSchema = z.object({
  medio: z.enum(["NEQUI", "BREB"]),
  titular: z.string().trim().max(150).optional().nullable(),
  numero_celular: z.string().trim().max(20).optional().nullable(),
  entidad: z.string().trim().max(100).optional().nullable(),
  llave: z.string().trim().max(150).optional().nullable(),
  imagen_url: z.string().trim().max(500).optional().nullable(),
  activo: z.boolean().default(true),
});

export const updateConfigGeneralSchema = z.object({
  whatsapp_comprobantes: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Usa formato internacional sin '+' (ej. 573001234567)"),
  whatsapp_soporte: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  instrucciones_whatsapp: z.string().trim().max(2000).optional().nullable(),
  plantilla_mensaje_whatsapp: z.string().trim().max(2000).optional().nullable(),
  horario_atencion: z.string().trim().max(255).optional().nullable(),
  reserva_minutos_defecto: z.coerce.number().int().min(5).max(120).default(15),
});

export const liberarNumerosSchema = z.object({
  id_rifa: z.coerce.number().int().positive(),
  numeros: z.array(z.coerce.number().int().min(0)).min(1),
  motivo: z.string().trim().min(5, "Debes indicar el motivo de la liberación"),
});

export const registrarSorteoSchema = z.object({
  nombre_loteria: z.string().trim().min(2, "Indica la lotería o mecanismo oficial").max(150),
  fecha_sorteo: z.string().min(8, "La fecha del sorteo es obligatoria"),
  resultado_oficial: z.string().trim().min(1, "Ingresa el resultado oficial").max(100),
  numero_ganador: z.coerce.number().int().min(0),
  evidencia_url: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  observaciones: z.string().trim().max(2000).optional().nullable(),
  finalizar_rifa: z.boolean().default(true),
});
