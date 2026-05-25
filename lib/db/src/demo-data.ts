import { FLEET_DEMO_ROWS } from "./fleet-demo-data";

export type DemoVehicleRecord = {
  id: number;
  marca_modelo: string;
  categoria: "Economico" | "Familiar" | "SUV" | "Premium";
  foto_url: string | null;
  preco_base_dia: string;
  valor_caucao: string;
  extra_franquia_zero: string;
  status: "disponivel" | "alugado" | "manutencao" | "reservado_temporario";
  created_at: Date | null;
};

export type DemoConfigRecord = {
  id: number;
  horario_abertura: string;
  horario_fecho: string;
  taxa_noturna: string;
  idade_minima: number;
  taxa_condutor_jovem: string;
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
};

export type DemoReservationRecord = {
  id: number;
  cliente_telefone: string;
  cliente_nome: string;
  cliente_idioma: string | null;
  veiculo_id: number;
  tipo_protecao: "standard_com_caucao" | "franquia_zero";
  data_levantamento: string;
  data_devolucao: string;
  hora_chegada_voo: string | null;
  taxa_noturna_aplicada: string | null;
  valor_total: string;
  status_pagamento: "pendente" | "pago_sinal" | "falhado";
  status_reserva: "criada" | "checkin_feito" | "carro_na_estrada" | "concluida";
  docs_checkin_url: Record<string, unknown> | null;
  fotos_estado_carro: Record<string, unknown> | null;
  stripe_intent_id: string | null;
  created_at: Date;
};

/** Estados realistas na frota demo (painel + página Frota). */
const FLEET_STATUS_OVERRIDES: Record<number, DemoVehicleRecord["status"]> = {
  3: "reservado_temporario",
  4: "alugado",
  7: "alugado",
  8: "alugado",
  9: "manutencao",
  11: "reservado_temporario",
};

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function listDemoFleet(status?: string): DemoVehicleRecord[] {
  let rows = FLEET_DEMO_ROWS.map((r, i) => {
    const id = i + 1;
    return {
      id,
      marca_modelo: r.marca_modelo,
      categoria: r.categoria,
      foto_url: r.foto_url ?? null,
      preco_base_dia: r.preco_base_dia,
      valor_caucao: r.valor_caucao,
      extra_franquia_zero: r.extra_franquia_zero,
      status: FLEET_STATUS_OVERRIDES[id] ?? r.status,
      created_at: null as Date | null,
    };
  });
  if (status) {
    rows = rows.filter((v) => v.status === status);
  }
  return rows;
}

export function getDemoFleetById(id: number): DemoVehicleRecord | undefined {
  return listDemoFleet().find((v) => v.id === id);
}

export function getDemoFleetSummary() {
  const fleet = listDemoFleet();
  return {
    disponivel: fleet.filter((v) => v.status === "disponivel").length,
    alugado: fleet.filter((v) => v.status === "alugado").length,
    manutencao: fleet.filter((v) => v.status === "manutencao").length,
    reservado_temporario: fleet.filter((v) => v.status === "reservado_temporario").length,
    total: fleet.length,
  };
}

export const DEMO_CONFIG: DemoConfigRecord = {
  id: 1,
  horario_abertura: "08:00",
  horario_fecho: "22:00",
  taxa_noturna: "30.00",
  idade_minima: 21,
  taxa_condutor_jovem: "15.00",
  stripe_secret_key: null,
  stripe_webhook_secret: null,
};

/** Reservas de exemplo — painel sempre preenchido (datas relativas a hoje). */
export function buildDemoReservations(): DemoReservationRecord[] {
  const today = todayIso();
  const yesterday = addDaysIso(-1);
  const tomorrow = addDaysIso(1);
  const in2 = addDaysIso(2);
  const in3 = addDaysIso(3);
  const in5 = addDaysIso(5);
  const in7 = addDaysIso(7);

  return [
    {
      id: 9001,
      cliente_telefone: "+351912000001",
      cliente_nome: "Ana Silva",
      cliente_idioma: "pt",
      veiculo_id: 1,
      tipo_protecao: "standard_com_caucao",
      data_levantamento: today,
      data_devolucao: in3,
      hora_chegada_voo: "14:30",
      taxa_noturna_aplicada: null,
      valor_total: "84.00",
      status_pagamento: "pago_sinal",
      status_reserva: "checkin_feito",
      docs_checkin_url: { ocr: { nome: "Ana Silva", doc: "CC" }, selfie: "ok" },
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9001",
      created_at: new Date(),
    },
    {
      id: 9002,
      cliente_telefone: "+447700900123",
      cliente_nome: "James Wright",
      cliente_idioma: "en",
      veiculo_id: 7,
      tipo_protecao: "franquia_zero",
      data_levantamento: today,
      data_devolucao: in7,
      hora_chegada_voo: "11:00",
      taxa_noturna_aplicada: null,
      valor_total: "396.00",
      status_pagamento: "pago_sinal",
      status_reserva: "criada",
      docs_checkin_url: { ocr: { nome: "James Wright" } },
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9002",
      created_at: new Date(),
    },
    {
      id: 9003,
      cliente_telefone: "+33612345678",
      cliente_nome: "Marie Dubois",
      cliente_idioma: "fr",
      veiculo_id: 4,
      tipo_protecao: "standard_com_caucao",
      data_levantamento: addDaysIso(-2),
      data_devolucao: yesterday,
      hora_chegada_voo: null,
      taxa_noturna_aplicada: null,
      valor_total: "126.00",
      status_pagamento: "pago_sinal",
      status_reserva: "carro_na_estrada",
      docs_checkin_url: { ocr: { nome: "Marie Dubois" } },
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9003",
      created_at: new Date(Date.now() - 86400000 * 2),
    },
    {
      id: 9004,
      cliente_telefone: "+34911222333",
      cliente_nome: "Carlos Ruiz",
      cliente_idioma: "es",
      veiculo_id: 10,
      tipo_protecao: "franquia_zero",
      data_levantamento: today,
      data_devolucao: in5,
      hora_chegada_voo: "09:00",
      taxa_noturna_aplicada: null,
      valor_total: "178.00",
      status_pagamento: "pendente",
      status_reserva: "criada",
      docs_checkin_url: null,
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9004",
      created_at: new Date(),
    },
    {
      id: 9005,
      cliente_telefone: "+4915123456789",
      cliente_nome: "Thomas Müller",
      cliente_idioma: "de",
      veiculo_id: 2,
      tipo_protecao: "standard_com_caucao",
      data_levantamento: today,
      data_devolucao: in2,
      hora_chegada_voo: "16:45",
      taxa_noturna_aplicada: null,
      valor_total: "52.00",
      status_pagamento: "pago_sinal",
      status_reserva: "checkin_feito",
      docs_checkin_url: { ocr: { nome: "Thomas Müller" } },
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9005",
      created_at: new Date(),
    },
    {
      id: 9006,
      cliente_telefone: "+351913000006",
      cliente_nome: "Rita Costa",
      cliente_idioma: "pt",
      veiculo_id: 6,
      tipo_protecao: "standard_com_caucao",
      data_levantamento: tomorrow,
      data_devolucao: in5,
      hora_chegada_voo: "10:30",
      taxa_noturna_aplicada: null,
      valor_total: "120.00",
      status_pagamento: "pendente",
      status_reserva: "criada",
      docs_checkin_url: null,
      fotos_estado_carro: null,
      stripe_intent_id: null,
      created_at: new Date(),
    },
    {
      id: 9007,
      cliente_telefone: "+351914000007",
      cliente_nome: "João Mendes",
      cliente_idioma: "pt",
      veiculo_id: 8,
      tipo_protecao: "franquia_zero",
      data_levantamento: addDaysIso(-1),
      data_devolucao: today,
      hora_chegada_voo: null,
      taxa_noturna_aplicada: null,
      valor_total: "156.00",
      status_pagamento: "pago_sinal",
      status_reserva: "carro_na_estrada",
      docs_checkin_url: { ocr: { nome: "João Mendes" } },
      fotos_estado_carro: {
        frente: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400",
      },
      stripe_intent_id: "pi_demo_9007",
      created_at: new Date(Date.now() - 86400000),
    },
    {
      id: 9008,
      cliente_telefone: "+447700900888",
      cliente_nome: "Emma Brown",
      cliente_idioma: "en",
      veiculo_id: 12,
      tipo_protecao: "franquia_zero",
      data_levantamento: today,
      data_devolucao: in3,
      hora_chegada_voo: "22:15",
      taxa_noturna_aplicada: "30.00",
      valor_total: "276.00",
      status_pagamento: "pendente",
      status_reserva: "criada",
      docs_checkin_url: null,
      fotos_estado_carro: null,
      stripe_intent_id: null,
      created_at: new Date(),
    },
    {
      id: 9009,
      cliente_telefone: "+351915000009",
      cliente_nome: "Pedro Alves",
      cliente_idioma: "pt",
      veiculo_id: 5,
      tipo_protecao: "standard_com_caucao",
      data_levantamento: in3,
      data_devolucao: in7,
      hora_chegada_voo: "08:00",
      taxa_noturna_aplicada: null,
      valor_total: "160.00",
      status_pagamento: "pago_sinal",
      status_reserva: "criada",
      docs_checkin_url: { ocr: { nome: "Pedro Alves" } },
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9009",
      created_at: new Date(),
    },
    {
      id: 9010,
      cliente_telefone: "+33698765432",
      cliente_nome: "Luc Martin",
      cliente_idioma: "fr",
      veiculo_id: 11,
      tipo_protecao: "standard_com_caucao",
      data_levantamento: today,
      data_devolucao: tomorrow,
      hora_chegada_voo: "13:00",
      taxa_noturna_aplicada: null,
      valor_total: "85.00",
      status_pagamento: "pago_sinal",
      status_reserva: "criada",
      docs_checkin_url: null,
      fotos_estado_carro: null,
      stripe_intent_id: "pi_demo_9010",
      created_at: new Date(),
    },
  ];
}

export type DemoSosRecord = {
  id: number;
  reserva_id: number;
  localizacao_latitude: number;
  localizacao_longitude: number;
  foto_problema_url: string | null;
  status: "ativo" | "resolvido";
  created_at: string;
};

export function buildDemoSosAlerts(activeOnly = true): DemoSosRecord[] {
  const alerts: DemoSosRecord[] = [
    {
      id: 8001,
      reserva_id: 9003,
      localizacao_latitude: 32.6485,
      localizacao_longitude: -16.908,
      foto_problema_url:
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop",
      status: "ativo",
      created_at: new Date().toISOString(),
    },
  ];
  return activeOnly ? alerts.filter((a) => a.status === "ativo") : alerts;
}

export function getDemoDashboardStats() {
  const demo = buildDemoReservations();
  const today = todayIso();
  const todayRes = demo.filter(
    (r) => r.data_levantamento === today || r.data_devolucao === today,
  );
  const paidToday = demo.filter(
    (r) =>
      r.status_pagamento === "pago_sinal" &&
      (r.data_levantamento === today || r.data_devolucao === today),
  );
  const revenueToday = paidToday.reduce((s, r) => s + parseFloat(r.valor_total), 0);
  const summary = getDemoFleetSummary();
  const withAiDocs = demo.filter((r) => r.docs_checkin_url && "ocr" in r.docs_checkin_url);

  const overdueReturns = demo.filter((r) => {
    const returnDate = new Date(r.data_devolucao + "T23:59:59");
    return (
      (r.status_reserva === "carro_na_estrada" || r.status_reserva === "checkin_feito") &&
      returnDate < new Date()
    );
  }).length;

  return {
    total_reservations_today: todayRes.length,
    pending_payment: demo.filter((r) => r.status_pagamento === "pendente").length,
    checkin_done: demo.filter((r) => r.status_reserva === "checkin_feito").length,
    cars_on_road: demo.filter((r) => r.status_reserva === "carro_na_estrada").length,
    active_sos: buildDemoSosAlerts(true).length,
    revenue_today: Math.round(revenueToday * 100) / 100,
    occupancy_rate:
      summary.total > 0 ? Math.round((summary.alugado / summary.total) * 100) : 25,
    overdue_returns: overdueReturns,
    counter_time_saved_minutes: 187,
    pre_checkin_completion_rate:
      demo.length > 0 ? Math.round((withAiDocs.length / demo.length) * 100) : 78,
  };
}

export function getDemoTodayActivity() {
  const today = todayIso();
  const fleet = listDemoFleet();
  const byId = new Map(fleet.map((v) => [v.id, v.marca_modelo]));
  const now = new Date();

  return buildDemoReservations().flatMap((r) => {
    const entries: Array<{
      id: number;
      cliente_nome: string;
      tipo: "levantamento" | "devolucao";
      hora: string;
      status_reserva: DemoReservationRecord["status_reserva"];
      status_pagamento: DemoReservationRecord["status_pagamento"];
      veiculo: string;
      cliente_idioma: string;
      overdue: boolean;
    }> = [];

    const returnDate = new Date(r.data_devolucao + "T23:59:59");
    const pickupToday = r.data_levantamento === today;
    const returnToday = r.data_devolucao === today;

    if (pickupToday) {
      entries.push({
        id: r.id,
        cliente_nome: r.cliente_nome,
        tipo: "levantamento",
        hora: r.hora_chegada_voo ?? "09:00",
        status_reserva: r.status_reserva,
        status_pagamento: r.status_pagamento,
        veiculo: byId.get(r.veiculo_id) ?? "Veículo",
        cliente_idioma: r.cliente_idioma ?? "pt",
        overdue:
          (r.status_reserva === "carro_na_estrada" || r.status_reserva === "criada") &&
          now > returnDate,
      });
    }
    if (returnToday && !pickupToday) {
      entries.push({
        id: r.id,
        cliente_nome: r.cliente_nome,
        tipo: "devolucao",
        hora: "18:00",
        status_reserva: r.status_reserva,
        status_pagamento: r.status_pagamento,
        veiculo: byId.get(r.veiculo_id) ?? "Veículo",
        cliente_idioma: r.cliente_idioma ?? "pt",
        overdue: r.status_reserva !== "concluida" && now > returnDate,
      });
    }
    return entries;
  });
}

/** Linhas para inserir na BD após seed da frota (Postgres). */
export function demoReservationRowsForDb() {
  return buildDemoReservations().map((r) => ({
    cliente_telefone: r.cliente_telefone,
    cliente_nome: r.cliente_nome,
    cliente_idioma: r.cliente_idioma,
    veiculo_id: r.veiculo_id,
    tipo_protecao: r.tipo_protecao,
    data_levantamento: r.data_levantamento,
    data_devolucao: r.data_devolucao,
    hora_chegada_voo: r.hora_chegada_voo,
    taxa_noturna_aplicada: r.taxa_noturna_aplicada,
    valor_total: r.valor_total,
    status_pagamento: r.status_pagamento,
    status_reserva: r.status_reserva,
    docs_checkin_url: r.docs_checkin_url,
    fotos_estado_carro: r.fotos_estado_carro,
    stripe_intent_id: r.stripe_intent_id,
  }));
}
