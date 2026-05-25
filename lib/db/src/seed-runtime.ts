import { eq } from "drizzle-orm";
import { getDb, getPool } from "./index";
import { demoReservationRowsForDb, listDemoFleet } from "./demo-data";
import { FLEET_DEMO_ROWS } from "./fleet-demo-data";
import { alertasSosTable, configOperacaoTable, frotaTable, reservasTable } from "./schema";

export type SeedRuntimeOptions = {
  /** Apaga reservas/SOS e repõe frota demo (útil no Railway). */
  reset?: boolean;
};

/**
 * Preenche/atualiza dados demo Autocunha.
 * Chamado no arranque da API (Railway) e via `pnpm db:seed`.
 */
export async function bootstrapDemoData(options: SeedRuntimeOptions = {}): Promise<void> {
  const reset = options.reset ?? process.env.AUTO_SEED_RESET !== "false";
  const db = getDb();
  const pool = getPool();

  if (reset) {
    await pool.query(
      "TRUNCATE TABLE alertas_sos, reservas, frota, config_operacao RESTART IDENTITY CASCADE",
    );
  }

  const existing = await db.select().from(frotaTable);
  const byName = new Map(existing.map((v) => [v.marca_modelo, v]));

  for (const row of FLEET_DEMO_ROWS) {
    const found = byName.get(row.marca_modelo);
    if (found) {
      await db
        .update(frotaTable)
        .set({
          categoria: row.categoria,
          foto_url: row.foto_url,
          preco_base_dia: row.preco_base_dia,
          valor_caucao: row.valor_caucao,
          extra_franquia_zero: row.extra_franquia_zero,
          status: row.status,
        })
        .where(eq(frotaTable.id, found.id));
    } else {
      await db.insert(frotaTable).values(row);
    }
  }

  const configs = await db.select().from(configOperacaoTable);
  const configRow = {
    horario_abertura: "08:00",
    horario_fecho: "22:00",
    taxa_noturna: "30.00",
    idade_minima: 21,
    taxa_condutor_jovem: "15.00",
  };

  if (configs.length === 0) {
    await db.insert(configOperacaoTable).values(configRow);
  } else {
    await db
      .update(configOperacaoTable)
      .set(configRow)
      .where(eq(configOperacaoTable.id, configs[0].id));
  }

  const fleetAfter = await db.select().from(frotaTable);
  const demoByModel = new Map(listDemoFleet().map((v) => [v.marca_modelo, v.status]));
  for (const v of fleetAfter) {
    const status = demoByModel.get(v.marca_modelo);
    if (status && status !== v.status) {
      await db.update(frotaTable).set({ status }).where(eq(frotaTable.id, v.id));
    }
  }

  const existingRes = await db.select().from(reservasTable);
  if (reset || existingRes.length === 0) {
    for (const row of demoReservationRowsForDb()) {
      await db.insert(reservasTable).values(row);
    }

    const marie = (await db.select().from(reservasTable)).find(
      (r) => r.cliente_nome === "Marie Dubois",
    );
    if (marie) {
      const sosExisting = await db.select().from(alertasSosTable);
      if (sosExisting.length === 0) {
        await db.insert(alertasSosTable).values({
          reserva_id: marie.id,
          localizacao_latitude: "32.648500",
          localizacao_longitude: "-16.908000",
          foto_problema_url:
            "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop",
          status: "ativo",
        });
      }
    }
  }
}
