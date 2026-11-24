import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const adminConnection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    timezone: "Z",
  });

  try {
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConnection.query(`USE \`${env.db.name}\`;`);
    await adminConnection.query("SET time_zone = '+00:00';");

    await adminConnection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [executedRows] = await adminConnection.query(
      "SELECT filename FROM schema_migrations"
    );
    const executed = new Set(executedRows.map((row) => row.filename));

    const entries = await fs.readdir(__dirname);
    const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();

    for (const file of sqlFiles) {
      if (executed.has(file)) {
        console.log(`[skip] ${file}`);
        continue;
      }
      const sql = await fs.readFile(path.join(__dirname, file), "utf8");
      console.log(`[run]  ${file}`);
      await adminConnection.query(sql);
      await adminConnection.query(
        "INSERT INTO schema_migrations (filename) VALUES (?)",
        [file]
      );
      console.log(`[done] ${file}`);
    }

    console.log("Migraciones completadas correctamente.");
  } finally {
    await adminConnection.end();
  }
}

runMigrations().catch((error) => {
  console.error("Error ejecutando migraciones:", error);
  process.exit(1);
});
