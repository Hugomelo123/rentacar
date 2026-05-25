import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reservasTable, frotaTable, configOperacaoTable } from "@workspace/db";
import {
  ListReservationsQueryParams,
  CreateReservationBody,
  GetReservationParams,
  GetReservationResponse,
  UpdateReservationParams,
  UpdateReservationBody,
  UpdateReservationResponse,
  SimulatePaymentParams,
  SimulatePaymentResponse,
  UploadDocsParams,
  UploadDocsBody,
  UploadDocsResponse,
  UploadCarPhotosParams,
  UploadCarPhotosBody,
  UploadCarPhotosResponse,
  ListReservationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseReservation(r: Record<string, unknown>, vehicle?: Record<string, unknown>) {
  return {
    ...r,
    taxa_noturna_aplicada: r.taxa_noturna_aplicada ? parseFloat(r.taxa_noturna_aplicada as string) : null,
    valor_total: parseFloat(r.valor_total as string ?? "0"),
    created_at: r.created_at ? String(r.created_at) : null,
    vehicle: vehicle ? {
      ...vehicle,
      preco_base_dia: parseFloat(vehicle.preco_base_dia as string ?? "0"),
      valor_caucao: parseFloat(vehicle.valor_caucao as string ?? "0"),
      extra_franquia_zero: parseFloat(vehicle.extra_franquia_zero as string ?? "0"),
      created_at: vehicle.created_at ? String(vehicle.created_at) : null,
    } : undefined,
  };
}

function isOutOfHours(horaChegada: string, abertura: string, fecho: string): boolean {
  const [h, m] = horaChegada.split(":").map(Number);
  const [ah, am] = abertura.split(":").map(Number);
  const [fh, fm] = fecho.split(":").map(Number);
  const chegadaMin = h * 60 + m;
  const aberturaMin = ah * 60 + am;
  const fechoMin = fh * 60 + fm;
  return chegadaMin < aberturaMin || chegadaMin > fechoMin;
}

function calculateDays(from: string, to: string): number {
  const d1 = new Date(from);
  const d2 = new Date(to);
  const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

router.get("/reservations", async (req, res): Promise<void> => {
  const parsed = ListReservationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [];
  if (parsed.data.status_reserva) {
    conditions.push(eq(reservasTable.status_reserva, parsed.data.status_reserva as "criada" | "checkin_feito" | "carro_na_estrada" | "concluida"));
  }
  if (parsed.data.status_pagamento) {
    conditions.push(eq(reservasTable.status_pagamento, parsed.data.status_pagamento as "pendente" | "pago_sinal" | "falhado"));
  }

  const reservations = await db
    .select()
    .from(reservasTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reservasTable.created_at);

  const vehicleIds = [...new Set(reservations.map((r) => r.veiculo_id))];
  const vehicles = vehicleIds.length > 0
    ? await db.select().from(frotaTable).where(eq(frotaTable.id, vehicleIds[0]))
    : [];

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  res.json(ListReservationsResponse.parse(
    reservations.map((r) => {
      const v = vehicleMap.get(r.veiculo_id);
      return parseReservation(r as unknown as Record<string, unknown>, v as unknown as Record<string, unknown> | undefined);
    })
  ));
});

router.post("/reservations", async (req, res): Promise<void> => {
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vehicle] = await db.select().from(frotaTable).where(eq(frotaTable.id, parsed.data.veiculo_id));
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  let [config] = await db.select().from(configOperacaoTable).limit(1);
  if (!config) {
    config = { id: 1, horario_abertura: "08:00", horario_fecho: "22:00", taxa_noturna: "30.00", idade_minima: 21, taxa_condutor_jovem: "15.00", stripe_secret_key: null, stripe_webhook_secret: null };
  }

  const days = calculateDays(parsed.data.data_levantamento, parsed.data.data_devolucao);
  const precoDia = parseFloat(vehicle.preco_base_dia);
  const extraFranquia = parsed.data.tipo_protecao === "franquia_zero" ? parseFloat(vehicle.extra_franquia_zero) : 0;

  let taxaNoturna = null;
  if (parsed.data.hora_chegada_voo && isOutOfHours(parsed.data.hora_chegada_voo, config.horario_abertura, config.horario_fecho)) {
    taxaNoturna = parseFloat(config.taxa_noturna ?? "30");
  }

  const valorTotal = days * precoDia + extraFranquia + (taxaNoturna ?? 0);

  // Mark vehicle as temporarily reserved
  await db.update(frotaTable).set({ status: "reservado_temporario" }).where(eq(frotaTable.id, vehicle.id));

  const [reservation] = await db.insert(reservasTable).values({
    cliente_telefone: parsed.data.cliente_telefone,
    cliente_nome: parsed.data.cliente_nome,
    cliente_idioma: parsed.data.cliente_idioma,
    veiculo_id: parsed.data.veiculo_id,
    tipo_protecao: parsed.data.tipo_protecao,
    data_levantamento: parsed.data.data_levantamento,
    data_devolucao: parsed.data.data_devolucao,
    hora_chegada_voo: parsed.data.hora_chegada_voo,
    taxa_noturna_aplicada: taxaNoturna ? String(taxaNoturna) : null,
    valor_total: String(valorTotal),
    status_pagamento: "pendente",
    status_reserva: "criada",
    stripe_intent_id: `pi_simulated_${Date.now()}`,
  }).returning();

  // Release after 15 min if no payment
  setTimeout(async () => {
    const [r] = await db.select().from(reservasTable).where(eq(reservasTable.id, reservation.id));
    if (r && r.status_pagamento === "pendente") {
      await db.update(frotaTable).set({ status: "disponivel" }).where(eq(frotaTable.id, vehicle.id));
    }
  }, 15 * 60 * 1000);

  const parsedReservation = parseReservation(
    reservation as unknown as Record<string, unknown>,
    vehicle as unknown as Record<string, unknown>
  );

  res.status(201).json({
    reservation: GetReservationResponse.parse(parsedReservation),
    payment_url: `https://checkout.stripe.com/simulated/${reservation.stripe_intent_id}`,
  });
});

router.get("/reservations/:id", async (req, res): Promise<void> => {
  const params = GetReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reservation] = await db.select().from(reservasTable).where(eq(reservasTable.id, params.data.id));
  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const [vehicle] = await db.select().from(frotaTable).where(eq(frotaTable.id, reservation.veiculo_id));

  res.json(GetReservationResponse.parse(
    parseReservation(reservation as unknown as Record<string, unknown>, vehicle as unknown as Record<string, unknown> | undefined)
  ));
});

router.patch("/reservations/:id", async (req, res): Promise<void> => {
  const params = UpdateReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status_reserva !== undefined) updateData.status_reserva = parsed.data.status_reserva;
  if (parsed.data.status_pagamento !== undefined) updateData.status_pagamento = parsed.data.status_pagamento;
  if (parsed.data.hora_chegada_voo !== undefined) updateData.hora_chegada_voo = parsed.data.hora_chegada_voo;

  const [reservation] = await db
    .update(reservasTable)
    .set(updateData)
    .where(eq(reservasTable.id, params.data.id))
    .returning();

  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  // Update vehicle status if reservation is on the road
  if (parsed.data.status_reserva === "carro_na_estrada") {
    await db.update(frotaTable).set({ status: "alugado" }).where(eq(frotaTable.id, reservation.veiculo_id));
  } else if (parsed.data.status_reserva === "concluida") {
    await db.update(frotaTable).set({ status: "disponivel" }).where(eq(frotaTable.id, reservation.veiculo_id));
  }

  const [vehicle] = await db.select().from(frotaTable).where(eq(frotaTable.id, reservation.veiculo_id));

  res.json(UpdateReservationResponse.parse(
    parseReservation(reservation as unknown as Record<string, unknown>, vehicle as unknown as Record<string, unknown> | undefined)
  ));
});

router.post("/reservations/:id/simulate-payment", async (req, res): Promise<void> => {
  const params = SimulatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reservation] = await db
    .update(reservasTable)
    .set({ status_pagamento: "pago_sinal" })
    .where(eq(reservasTable.id, params.data.id))
    .returning();

  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const [vehicle] = await db.select().from(frotaTable).where(eq(frotaTable.id, reservation.veiculo_id));

  res.json(SimulatePaymentResponse.parse(
    parseReservation(reservation as unknown as Record<string, unknown>, vehicle as unknown as Record<string, unknown> | undefined)
  ));
});

router.post("/reservations/:id/upload-docs", async (req, res): Promise<void> => {
  const params = UploadDocsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UploadDocsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(reservasTable).where(eq(reservasTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const prevDocs = (existing.docs_checkin_url as Record<string, unknown> | null) ?? {};
  const mergedDocs = { ...prevDocs, ...(parsed.data.docs as Record<string, unknown>) };

  const [reservation] = await db
    .update(reservasTable)
    .set({ docs_checkin_url: mergedDocs })
    .where(eq(reservasTable.id, params.data.id))
    .returning();

  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const [vehicle] = await db.select().from(frotaTable).where(eq(frotaTable.id, reservation.veiculo_id));

  res.json(UploadDocsResponse.parse(
    parseReservation(reservation as unknown as Record<string, unknown>, vehicle as unknown as Record<string, unknown> | undefined)
  ));
});

router.post("/reservations/:id/upload-car-photos", async (req, res): Promise<void> => {
  const params = UploadCarPhotosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UploadCarPhotosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reservation] = await db
    .update(reservasTable)
    .set({ fotos_estado_carro: parsed.data.fotos as Record<string, string> })
    .where(eq(reservasTable.id, params.data.id))
    .returning();

  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const [vehicle] = await db.select().from(frotaTable).where(eq(frotaTable.id, reservation.veiculo_id));

  res.json(UploadCarPhotosResponse.parse(
    parseReservation(reservation as unknown as Record<string, unknown>, vehicle as unknown as Record<string, unknown> | undefined)
  ));
});

// Stripe webhook (simulated)
router.post("/stripe/webhook", async (_req, res): Promise<void> => {
  res.json({ received: true });
});

export default router;
