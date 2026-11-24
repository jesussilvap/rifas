import crypto from "node:crypto";

export function formatNumero(numero, digitos = 3) {
  return String(numero).padStart(Number(digitos) || 3, "0");
}

export function generateCode(prefix) {
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${randomPart}`;
}

export function generateAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function normalizeWhatsapp(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  return digits;
}

export function maskName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .map((part, idx) =>
      idx === 0 ? part : `${part.charAt(0)}${"*".repeat(Math.max(part.length - 1, 2))}`
    )
    .join(" ");
}

export function maskWhatsapp(whatsapp = "") {
  const digits = String(whatsapp).replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export class AppError extends Error {
  constructor(message, statusCode = 400, code = "BAD_REQUEST", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
