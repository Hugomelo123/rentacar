import {
  buildDemoReservations,
  buildDemoSosAlerts,
  DEMO_CONFIG,
  getDemoDashboardStats,
  getDemoFleetById,
  getDemoFleetSummary,
  getDemoTodayActivity,
  listDemoFleet,
  type DemoConfigRecord,
  type DemoReservationRecord,
  type DemoSosRecord,
} from "@workspace/db/demo-data";

export {
  listDemoFleet,
  getDemoFleetById,
  getDemoFleetSummary,
  DEMO_CONFIG,
  buildDemoReservations,
  getDemoDashboardStats,
  getDemoTodayActivity,
};

/** Sem Postgres: API serve dados demo automáticos (frota, config, reservas exemplo). */
export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL?.trim();
}

let demoConfig: DemoConfigRecord = { ...DEMO_CONFIG };
let demoReservations: DemoReservationRecord[] = buildDemoReservations();
let nextReservationId = 10000;

export function getDemoConfig(): DemoConfigRecord {
  return { ...demoConfig };
}

export function patchDemoConfig(patch: Partial<DemoConfigRecord>): DemoConfigRecord {
  demoConfig = { ...demoConfig, ...patch };
  return getDemoConfig();
}

export function listDemoReservations(): DemoReservationRecord[] {
  return [...demoReservations];
}

export function getDemoReservation(id: number): DemoReservationRecord | undefined {
  return demoReservations.find((r) => r.id === id);
}

export function addDemoReservation(
  row: Omit<DemoReservationRecord, "id" | "created_at">,
): DemoReservationRecord {
  const created: DemoReservationRecord = {
    ...row,
    id: nextReservationId++,
    created_at: new Date(),
  };
  demoReservations = [created, ...demoReservations];
  return created;
}

export function updateDemoReservation(
  id: number,
  patch: Partial<DemoReservationRecord>,
): DemoReservationRecord | undefined {
  const idx = demoReservations.findIndex((r) => r.id === id);
  if (idx < 0) return undefined;
  demoReservations[idx] = { ...demoReservations[idx], ...patch };
  return demoReservations[idx];
}

export function resetDemoReservations(): void {
  demoReservations = buildDemoReservations();
  nextReservationId = 10000;
}

let demoSosAlerts: DemoSosRecord[] = buildDemoSosAlerts(true);

function reservationForApi(r: DemoReservationRecord) {
  const vehicle = getDemoFleetById(r.veiculo_id);
  return {
    ...r,
    taxa_noturna_aplicada: r.taxa_noturna_aplicada ? parseFloat(r.taxa_noturna_aplicada) : null,
    valor_total: parseFloat(r.valor_total),
    created_at: r.created_at.toISOString(),
    vehicle: vehicle
      ? {
          ...vehicle,
          preco_base_dia: parseFloat(vehicle.preco_base_dia),
          valor_caucao: parseFloat(vehicle.valor_caucao),
          extra_franquia_zero: parseFloat(vehicle.extra_franquia_zero),
          created_at: null,
        }
      : undefined,
  };
}

export function listDemoSosAlerts(status?: "ativo" | "resolvido") {
  let alerts = [...demoSosAlerts];
  if (status) alerts = alerts.filter((a) => a.status === status);
  return alerts.map((a) => {
    const reservation = demoReservations.find((r) => r.id === a.reserva_id);
    return {
      ...a,
      reservation: reservation ? reservationForApi(reservation) : undefined,
    };
  });
}

export function resolveDemoSos(id: number): ReturnType<typeof listDemoSosAlerts>[0] | undefined {
  const idx = demoSosAlerts.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  demoSosAlerts[idx] = { ...demoSosAlerts[idx], status: "resolvido" };
  return listDemoSosAlerts().find((a) => a.id === id);
}
