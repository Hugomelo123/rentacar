/**
 * Dados de demonstração para Autocunha — executar após drizzle push.
 * Uso: pnpm --filter @workspace/db run seed
 */
import { db, frotaTable, configOperacaoTable } from "./index";
import { FLEET_DEMO_ROWS } from "./fleet-demo-data";

async function seed() {
  const existing = await db.select().from(frotaTable);
  const names = new Set(existing.map((v) => v.marca_modelo));
  const toInsert = FLEET_DEMO_ROWS.filter((v) => !names.has(v.marca_modelo));

  if (toInsert.length > 0) {
    await db.insert(frotaTable).values(toInsert);
    console.log(`✓ Inseridos ${toInsert.length} veículo(s) novos (${existing.length + toInsert.length} no total)`);
  } else {
    console.log(`✓ Frota completa — ${existing.length} veículo(s) na base`);
  }

  const configs = await db.select().from(configOperacaoTable);
  if (configs.length === 0) {
    await db.insert(configOperacaoTable).values({
      horario_abertura: "08:00",
      horario_fecho: "22:00",
      taxa_noturna: "30.00",
      idade_minima: 21,
      taxa_condutor_jovem: "15.00",
    });
    console.log("✓ Configuração operacional criada");
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
