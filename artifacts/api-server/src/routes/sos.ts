import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, alertasSosTable, reservasTable, frotaTable } from "@workspace/db";
import {
  ListSosAlertsQueryParams,
  CreateSosAlertBody,
  ResolveSosAlertParams,
  ResolveSosAlertResponse,
  ListSosAlertsResponse,
  ListSosAlertsResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseSos(s: Record<string, unknown>, reservation?: Record<string, unknown>) {
  return {
    ...s,
    localizacao_latitude: s.localizacao_latitude ? parseFloat(s.localizacao_latitude as string) : null,
    localizacao_longitude: s.localizacao_longitude ? parseFloat(s.localizacao_longitude as string) : null,
    created_at: s.created_at ? String(s.created_at) : new Date().toISOString(),
    reservation: reservation ? {
      ...reservation,
      taxa_noturna_aplicada: reservation.taxa_noturna_aplicada ? parseFloat(reservation.taxa_noturna_aplicada as string) : null,
      valor_total: parseFloat(reservation.valor_total as string ?? "0"),
      created_at: reservation.created_at ? String(reservation.created_at) : null,
    } : undefined,
  };
}

router.get("/sos", async (req, res): Promise<void> => {
  const parsed = ListSosAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db.select().from(alertasSosTable).$dynamic();
  if (parsed.data.status) {
    query = query.where(eq(alertasSosTable.status, parsed.data.status as "ativo" | "resolvido"));
  }

  const alerts = await query.orderBy(alertasSosTable.created_at);

  const enriched = await Promise.all(alerts.map(async (a) => {
    const [reservation] = await db.select().from(reservasTable).where(eq(reservasTable.id, a.reserva_id));
    return parseSos(a as unknown as Record<string, unknown>, reservation as unknown as Record<string, unknown> | undefined);
  }));

  res.json(ListSosAlertsResponse.parse(enriched));
});

router.post("/sos", async (req, res): Promise<void> => {
  const parsed = CreateSosAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [alert] = await db.insert(alertasSosTable).values({
    reserva_id: parsed.data.reserva_id,
    localizacao_latitude: parsed.data.localizacao_latitude ? String(parsed.data.localizacao_latitude) : null,
    localizacao_longitude: parsed.data.localizacao_longitude ? String(parsed.data.localizacao_longitude) : null,
    foto_problema_url: parsed.data.foto_problema_url,
    status: "ativo",
  }).returning();

  const [reservation] = await db.select().from(reservasTable).where(eq(reservasTable.id, alert.reserva_id));

  res.status(201).json(ListSosAlertsResponseItem.parse(
    parseSos(alert as unknown as Record<string, unknown>, reservation as unknown as Record<string, unknown> | undefined)
  ));
});

router.patch("/sos/:id/resolve", async (req, res): Promise<void> => {
  const params = ResolveSosAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .update(alertasSosTable)
    .set({ status: "resolvido" })
    .where(eq(alertasSosTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "SOS alert not found" });
    return;
  }

  const [reservation] = await db.select().from(reservasTable).where(eq(reservasTable.id, alert.reserva_id));

  res.json(ResolveSosAlertResponse.parse(
    parseSos(alert as unknown as Record<string, unknown>, reservation as unknown as Record<string, unknown> | undefined)
  ));
});

export default router;
