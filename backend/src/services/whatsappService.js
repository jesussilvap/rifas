import { normalizeWhatsapp } from "../utils/formatters.js";

/**
 * Construye enlace https://wa.me/{numeroInternacional} sin anteponer indicativos duplicados.
 */
export function buildWhatsappLink({
  whatsappInternacional,
  rifa,
  participante,
  numeros,
  valorFormateado,
  codigoSolicitud,
  plantilla,
}) {
  const cleanPhone = normalizeWhatsapp(whatsappInternacional);
  const template =
    plantilla ||
    "Hola, he realizado el pago de mi participación.\n\nRifa: [NOMBRE DE LA RIFA]\nNombre: [NOMBRE DEL PARTICIPANTE]\nNúmeros: [NÚMEROS]\nValor: [TOTAL]\nCódigo de solicitud: [CÓDIGO]";

  const mensaje = template
    .replaceAll("[NOMBRE DE LA RIFA]", rifa)
    .replaceAll("[NOMBRE DEL PARTICIPANTE]", participante)
    .replaceAll("[NÚMEROS]", Array.isArray(numeros) ? numeros.join(", ") : String(numeros))
    .replaceAll("[TOTAL]", valorFormateado)
    .replaceAll("[CÓDIGO]", codigoSolicitud);

  return {
    whatsapp: cleanPhone,
    mensaje,
    url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje.trim())}`,
  };
}
