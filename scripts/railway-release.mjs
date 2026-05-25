/**
 * Correr no Railway (releaseCommand) após ligar PostgreSQL com DATABASE_URL.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL;

if (!url) {
  console.log("DATABASE_URL não definida — release ignorado (adicione Postgres ao projeto).");
  process.exit(0);
}

const sql = readFileSync(join(root, "scripts/init-schema.sql"), "utf8");

try {
  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString: url });
  await pool.query(sql);
  await pool.end();
  console.log("✓ Schema PostgreSQL aplicado");
} catch (err) {
  console.error("✗ Falha no schema:", err);
  process.exit(1);
}
