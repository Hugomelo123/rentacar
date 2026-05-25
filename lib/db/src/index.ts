import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type Db = NodePgDatabase<typeof schema>;

let _pool: pg.Pool | null = null;
let _db: Db | null = null;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

/** Ligação lazy — não rebenta ao importar (necessário para healthcheck no Railway). */
export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: requireDatabaseUrl() });
  }
  return _pool;
}

export function getDb(): Db {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

function bindProxy<T extends object>(getTarget: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop) {
      const target = getTarget() as Record<string | symbol, unknown>;
      const value = target[prop];
      if (typeof value === "function") {
        return (value as (...args: unknown[]) => unknown).bind(target);
      }
      return value;
    },
  });
}

export const pool = bindProxy(getPool);
export const db = bindProxy(getDb);

export * from "./schema";
