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
    const { pool } = await import("@workspace/db");
    await pool.query(sql);
    logger.info("PostgreSQL schema ready");
  } catch (err) {
    // Não bloquear arranque no Railway: healthcheck precisa de /api/healthz
    logger.error({ err }, "Database bootstrap failed (app will start without DB)");
  }
}
