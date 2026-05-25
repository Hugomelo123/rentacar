/** Executa query à BD; em falha devolve null (usa fallback demo). */
export async function tryDb<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}
