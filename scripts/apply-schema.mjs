import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "scripts/init-schema.sql"), "utf8");

function viaDocker() {
  const result = spawnSync(
    "docker",
    ["exec", "-i", "premium-strong-db", "psql", "-U", "autocunha", "-d", "rentacar", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  if (result.status === 0) {
    console.log("✓ Schema aplicado via Docker/PostgreSQL");
    return true;
  }
  console.error(result.stderr || result.stdout);
  return false;
}

async function viaPg() {
  const envPath = join(root, ".env");
  let databaseUrl = "postgresql://autocunha:autocunha@127.0.0.1:5432/rentacar";
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) databaseUrl = line.replace("DATABASE_URL=", "").trim();
  }
  try {
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: databaseUrl });
    await pool.query(sql);
    await pool.end();
    console.log("✓ Schema aplicado via DATABASE_URL");
    return true;
  } catch {
    return false;
  }
}

if (!(await viaPg()) && !viaDocker()) {
  console.error("✗ Falha ao aplicar schema. Confirme Docker: docker compose up -d");
  process.exit(1);
}
