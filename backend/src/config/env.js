import dotenv from "dotenv";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: toInt(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || "devsoluciones_rifas",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  },
  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "dev_only_secret_change_before_production_123456"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  cookieName: process.env.COOKIE_NAME || "ds_rifas_session",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  apiUrl: process.env.API_URL || "http://localhost:3000",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadMaxMb: toInt(process.env.UPLOAD_MAX_MB, 5),
  storageDriver: process.env.STORAGE_DRIVER || "local",
  timezone: process.env.TIMEZONE || "America/Bogota",
  reservationCron: process.env.RESERVATION_CRON || "*/1 * * * *",
};

export function assertProductionEnv() {
  if (!env.isProd) return;
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET debe definirse con al menos 32 caracteres en producción");
  }
  if (!env.db.password) {
    throw new Error("DB_PASSWORD es obligatorio en producción");
  }
}
