import { pgTable, serial, text, decimal, integer, pgEnum, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { frotaTable } from "./fleet";

export const tipoProtecaoEnum = pgEnum("tipo_protecao", ["standard_com_caucao", "franquia_zero"]);
export const statusPagamentoEnum = pgEnum("status_pagamento", ["pendente", "pago_sinal", "falhado"]);
export const statusReservaEnum = pgEnum("status_reserva", ["criada", "checkin_feito", "carro_na_estrada", "concluida"]);

export const reservasTable = pgTable("reservas", {
  id: serial("id").primaryKey(),
  cliente_telefone: text("cliente_telefone").notNull(),
  cliente_nome: text("cliente_nome").notNull(),
  cliente_idioma: text("cliente_idioma"),
  veiculo_id: integer("veiculo_id").notNull().references(() => frotaTable.id),
  tipo_protecao: tipoProtecaoEnum("tipo_protecao").notNull(),
  data_levantamento: text("data_levantamento").notNull(),
  data_devolucao: text("data_devolucao").notNull(),
  hora_chegada_voo: text("hora_chegada_voo"),
  taxa_noturna_aplicada: decimal("taxa_noturna_aplicada", { precision: 10, scale: 2 }),
  valor_total: decimal("valor_total", { precision: 10, scale: 2 }).notNull(),
  status_pagamento: statusPagamentoEnum("status_pagamento").notNull().default("pendente"),
  status_reserva: statusReservaEnum("status_reserva").notNull().default("criada"),
  docs_checkin_url: jsonb("docs_checkin_url"),
  fotos_estado_carro: jsonb("fotos_estado_carro"),
  stripe_intent_id: text("stripe_intent_id"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertReservaSchema = createInsertSchema(reservasTable).omit({ id: true, created_at: true });
export type InsertReserva = z.infer<typeof insertReservaSchema>;
export type Reserva = typeof reservasTable.$inferSelect;
