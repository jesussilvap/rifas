export function formatCOP(amount, currency = "COP") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function formatBogotaDate(isoString) {
  if (!isoString) return "Por definir";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

/**
 * Convierte una fecha ISO (UTC) al formato YYYY-MM-DDTHH:mm en hora Colombia (America/Bogota)
 * para inputs <input type="datetime-local">.
 */
export function toBogotaInputValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatNumero(numero, digitos = 3) {
  return String(numero).padStart(Number(digitos) || 3, "0");
}

/**
 * Copia al portapapeles con respaldo para navegadores integrados (WhatsApp/Instagram).
 */
export async function copyTextSafely(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function buildWhatsappUrl({ whatsappInternacional, mensaje }) {
  const digits = String(whatsappInternacional || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(String(mensaje || "").trim())}`;
}
