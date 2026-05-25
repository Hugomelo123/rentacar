import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { logger } from "./lib/logger";

/** Aplica schema SQL na primeira arrancada (Railway / produção). Idempotente. */
export async function bootstrapDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.SKIP_DB_BOOTSTRAP === "true") {
    return;
  }

  const sqlPath = path.resolve(process.cwd(), "scripts/init-schema.sql");
  if (!existsSync(sqlPath)) {
    logger.warn({ sqlPath }, "init-schema.sql not found, skip DB bootstrap");
    return;
  }

  try {
    const sql = readFileSync(sqlPath, "utf8");
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: url });
    await pool.query(sql);
    await pool.end();
    logger.info("PostgreSQL schema ready");
  } catch (err) {
    logger.error({ err }, "Database bootstrap failed");
    throw err;
  }
}
