import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, configOperacaoTable } from "@workspace/db";
import { UpdateConfigBody, GetConfigResponse, UpdateConfigResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/config", async (req, res): Promise<void> => {
  let [config] = await db.select().from(configOperacaoTable).limit(1);
  if (!config) {
    [config] = await db
      .insert(configOperacaoTable)
      .values({
        horario_abertura: "08:00",
        horario_fecho: "22:00",
        taxa_noturna: "30.00",
        idade_minima: 21,
        taxa_condutor_jovem: "15.00",
      })
      .returning();
  }
  res.json(GetConfigResponse.parse({
    ...config,
    taxa_noturna: parseFloat(config.taxa_noturna ?? "30"),
    taxa_condutor_jovem: parseFloat(config.taxa_condutor_jovem ?? "15"),
  }));
});

router.patch("/config", async (req, res): Promise<void> => {
  const parsed = UpdateConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [config] = await db.select().from(configOperacaoTable).limit(1);
  if (!config) {
    [config] = await db
      .insert(configOperacaoTable)
      .values({
        horario_abertura: "08:00",
        horario_fecho: "22:00",
        taxa_noturna: "30.00",
        idade_minima: 21,
        taxa_condutor_jovem: "15.00",
      })
      .returning();
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.horario_abertura !== undefined) updateData.horario_abertura = parsed.data.horario_abertura;
  if (parsed.data.horario_fecho !== undefined) updateData.horario_fecho = parsed.data.horario_fecho;
  if (parsed.data.taxa_noturna !== undefined) updateData.taxa_noturna = String(parsed.data.taxa_noturna);
  if (parsed.data.idade_minima !== undefined) updateData.idade_minima = parsed.data.idade_minima;
  if (parsed.data.taxa_condutor_jovem !== undefined) updateData.taxa_condutor_jovem = String(parsed.data.taxa_condutor_jovem);
  if (parsed.data.stripe_secret_key !== undefined) updateData.stripe_secret_key = parsed.data.stripe_secret_key;
  if (parsed.data.stripe_webhook_secret !== undefined) updateData.stripe_webhook_secret = parsed.data.stripe_webhook_secret;

  const [updated] = await db
    .update(configOperacaoTable)
    .set(updateData)
    .where(eq(configOperacaoTable.id, config.id))
    .returning();

  res.json(UpdateConfigResponse.parse({
    ...updated,
    taxa_noturna: parseFloat(updated.taxa_noturna ?? "30"),
    taxa_condutor_jovem: parseFloat(updated.taxa_condutor_jovem ?? "15"),
  }));
});

export default router;
