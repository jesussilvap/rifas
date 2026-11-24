import mysql from "mysql2/promise";
import { env } from "./env.js";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  decimalNumbers: true,
});

// Garantizar que cada nueva conexión use UTC para CURRENT_TIMESTAMP
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/**
 * Ejecuta una función dentro de una transacción MySQL InnoDB.
 * Realiza COMMIT si tiene éxito o ROLLBACK automático ante cualquier error.
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function testDatabaseConnection() {
  const [rows] = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}
