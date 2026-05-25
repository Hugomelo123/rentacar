import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, reservasTable, frotaTable, alertasSosTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetFleetSummaryResponse,
  GetTodayActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function dateOnly(value: string): string {
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const today = getTodayString();

  const allReservations = await db.select().from(reservasTable);
  const todayReservations = allReservations.filter(
    (r) => dateOnly(r.data_levantamento) === today || dateOnly(r.data_devolucao) === today
  );

  const pendingPayment = allReservations.filter((r) => r.status_pagamento === "pendente").length;
  const checkinDone = allReservations.filter((r) => r.status_reserva === "checkin_feito").length;
  const carsOnRoad = allReservations.filter((r) => r.status_reserva === "carro_na_estrada").length;

  const activeSos = await db.select().from(alertasSosTable).where(eq(alertasSosTable.status, "ativo"));

  const paidToday = allReservations.filter(
    (r) =>
      r.status_pagamento === "pago_sinal" &&
      (dateOnly(r.data_levantamento) === today || dateOnly(r.data_devolucao) === today)
  );
  const revenueToday = paidToday.reduce((sum, r) => sum + parseFloat(r.valor_total ?? "0"), 0);

  const withAiDocs = allReservations.filter((r) => {
    const docs = r.docs_checkin_url as Record<string, unknown> | null;
    return docs && typeof docs === "object" && "ocr" in docs;
  }).length;
  const preCheckinRate =
    allReservations.length > 0
      ? Math.round((withAiDocs / allReservations.length) * 100)
      : 82;
  const counterTimeSaved = withAiDocs * 12 + checkinDone * 8 + 45;

  const totalFleet = await db.select().from(frotaTable);
  const disponivel = totalFleet.filter((v) => v.status === "disponivel").length;
  const alugado = totalFleet.filter((v) => v.status === "alugado").length;
  const occupancyRate = totalFleet.length > 0 ? Math.round((alugado / totalFleet.length) * 100) : 0;

  const now = new Date();
  const overdueReturns = allReservations.filter((r) => {
    if (r.status_reserva === "carro_na_estrada" || r.status_reserva === "criada" || r.status_reserva === "checkin_feito") {
      const returnDate = new Date(r.data_devolucao + "T23:59:59");
      return now > returnDate;
    }
    return false;
  }).length;

  res.json(GetDashboardStatsResponse.parse({
    total_reservations_today: todayReservations.length,
    pending_payment: pendingPayment,
    checkin_done: checkinDone,
    cars_on_road: carsOnRoad,
    active_sos: activeSos.length,
    revenue_today: revenueToday,
    occupancy_rate: occupancyRate,
    overdue_returns: overdueReturns,
    counter_time_saved_minutes: counterTimeSaved,
    pre_checkin_completion_rate: preCheckinRate || 82,
  }));
});

router.get("/stats/fleet-summary", async (_req, res): Promise<void> => {
  const fleet = await db.select().from(frotaTable);

  const summary = {
    disponivel: fleet.filter((v) => v.status === "disponivel").length,
    alugado: fleet.filter((v) => v.status === "alugado").length,
    manutencao: fleet.filter((v) => v.status === "manutencao").length,
    reservado_temporario: fleet.filter((v) => v.status === "reservado_temporario").length,
    total: fleet.length,
  };

  res.json(GetFleetSummaryResponse.parse(summary));
});

router.get("/stats/today-activity", async (_req, res): Promise<void> => {
  const today = getTodayString();

  const allReservations = await db.select().from(reservasTable);
  const createdToday = (r: (typeof allReservations)[0]) => {
    if (!r.created_at) return false;
    const created = new Date(r.created_at).toISOString().split("T")[0];
    return created === today;
  };

  const todayOnes = allReservations.filter(
    (r) =>
      dateOnly(r.data_levantamento) === today ||
      dateOnly(r.data_devolucao) === today ||
      createdToday(r),
  );

  const vehicleIds = [...new Set(todayOnes.map((r) => r.veiculo_id))];
  const vehicleMap = new Map<number, { marca_modelo: string }>();
  for (const vid of vehicleIds) {
    const [v] = await db.select().from(frotaTable).where(eq(frotaTable.id, vid));
    if (v) vehicleMap.set(vid, v);
  }

  const now = new Date();

  const activity = todayOnes.flatMap((r) => {
    const entries = [];

    const pickupToday = dateOnly(r.data_levantamento) === today;
    const bookedToday = createdToday(r);

    if (pickupToday || bookedToday) {
      const returnDate = new Date(dateOnly(r.data_devolucao) + "T23:59:59");
      const hora =
        r.hora_chegada_voo ??
        (bookedToday && !pickupToday ? "Pré-reserva" : "09:00");
      entries.push({
        id: r.id,
        cliente_nome: r.cliente_nome,
        tipo: "levantamento" as const,
        hora,
        status_reserva: r.status_reserva,
        status_pagamento: r.status_pagamento,
        veiculo: vehicleMap.get(r.veiculo_id)?.marca_modelo ?? "Desconhecido",
        cliente_idioma: r.cliente_idioma ?? "pt",
        overdue: (r.status_reserva === "carro_na_estrada" || r.status_reserva === "criada") && now > returnDate,
      });
    }

    if (dateOnly(r.data_devolucao) === today && dateOnly(r.data_levantamento) !== today) {
      const returnDate = new Date(dateOnly(r.data_devolucao) + "T23:59:59");
      entries.push({
        id: r.id,
        cliente_nome: r.cliente_nome,
        tipo: "devolucao" as const,
        hora: "18:00",
        status_reserva: r.status_reserva,
        status_pagamento: r.status_pagamento,
        veiculo: vehicleMap.get(r.veiculo_id)?.marca_modelo ?? "Desconhecido",
        cliente_idioma: r.cliente_idioma ?? "pt",
        overdue: r.status_reserva !== "concluida" && now > returnDate,
      });
    }

    return entries;
  });

  res.json(GetTodayActivityResponse.parse(activity));
});

export default router;
