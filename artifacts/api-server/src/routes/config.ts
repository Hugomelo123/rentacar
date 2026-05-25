import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, configOperacaoTable } from "@workspace/db";
import { UpdateConfigBody, GetConfigResponse, UpdateConfigResponse } from "@workspace/api-zod";
import { getDemoConfig, isDemoMode, patchDemoConfig } from "../lib/demo-mode";

const router: IRouter = Router();

function formatConfigResponse(config: {
  horario_abertura: string;
  horario_fecho: string;
  taxa_noturna: string;
  idade_minima: number;
  taxa_condutor_jovem: string;
  stripe_secret_key?: string | null;
  stripe_webhook_secret?: string | null;
  id?: number;
}) {
  return GetConfigResponse.parse({
    ...config,
    id: config.id ?? 1,
    taxa_noturna: parseFloat(config.taxa_noturna ?? "30"),
    taxa_condutor_jovem: parseFloat(config.taxa_condutor_jovem ?? "15"),
  });
}

router.get("/config", async (req, res): Promise<void> => {
  if (isDemoMode()) {
    const c = getDemoConfig();
    res.json(formatConfigResponse(c));
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
  res.json(formatConfigResponse(config));
});

router.patch("/config", async (req, res): Promise<void> => {
  const parsed = UpdateConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDemoMode()) {
    const updated = patchDemoConfig({
      ...(parsed.data.horario_abertura !== undefined && { horario_abertura: parsed.data.horario_abertura }),
      ...(parsed.data.horario_fecho !== undefined && { horario_fecho: parsed.data.horario_fecho }),
      ...(parsed.data.taxa_noturna !== undefined && { taxa_noturna: String(parsed.data.taxa_noturna) }),
      ...(parsed.data.idade_minima !== undefined && { idade_minima: parsed.data.idade_minima }),
      ...(parsed.data.taxa_condutor_jovem !== undefined && {
        taxa_condutor_jovem: String(parsed.data.taxa_condutor_jovem),
      }),
      ...(parsed.data.stripe_secret_key !== undefined && { stripe_secret_key: parsed.data.stripe_secret_key }),
      ...(parsed.data.stripe_webhook_secret !== undefined && {
        stripe_webhook_secret: parsed.data.stripe_webhook_secret,
      }),
    });
    res.json(UpdateConfigResponse.parse({
      ...updated,
      taxa_noturna: parseFloat(updated.taxa_noturna),
      taxa_condutor_jovem: parseFloat(updated.taxa_condutor_jovem),
    }));
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
