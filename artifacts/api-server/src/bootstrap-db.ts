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
    const { getPool } = await import("@workspace/db");
    await getPool().query(sql);
    logger.info("PostgreSQL schema ready");

    const autoSeed = process.env.AUTO_SEED_DEMO !== "false";
    if (autoSeed) {
      const { bootstrapDemoData } = await import("@workspace/db/seed-runtime");
      const reset = process.env.AUTO_SEED_RESET !== "false";
      await bootstrapDemoData({ reset });
      logger.info(
        { reset },
        "Demo data ready (fleet synced; reset clears reservations/SOS)",
      );
    }
  } catch (err) {
    logger.error({ err }, "Database bootstrap failed (app will start without DB)");
  }
}
