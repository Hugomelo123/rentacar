/**
 * Dados de demonstração — CLI local: pnpm --filter @workspace/db run seed
 */
import { bootstrapDemoData } from "./seed-runtime";

async function seed() {
  const reset = process.env.SEED_RESET === "true";
  await bootstrapDemoData({ reset });
  console.log(
    reset
      ? "✓ Demo resetada: frota + config atualizados (reservas/SOS limpos)"
      : "✓ Frota e config sincronizados com dados demo",
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
