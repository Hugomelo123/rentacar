import { pgTable, serial, text, decimal, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriaEnum = pgEnum("categoria", ["Economico", "Familiar", "SUV", "Premium"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["disponivel", "alugado", "manutencao", "reservado_temporario"]);

export const frotaTable = pgTable("frota", {
  id: serial("id").primaryKey(),
  marca_modelo: text("marca_modelo").notNull(),
  categoria: categoriaEnum("categoria").notNull(),
  foto_url: text("foto_url"),
  preco_base_dia: decimal("preco_base_dia", { precision: 10, scale: 2 }).notNull(),
  valor_caucao: decimal("valor_caucao", { precision: 10, scale: 2 }).notNull(),
  extra_franquia_zero: decimal("extra_franquia_zero", { precision: 10, scale: 2 }).notNull(),
  status: vehicleStatusEnum("status").notNull().default("disponivel"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertFrotaSchema = createInsertSchema(frotaTable).omit({ id: true, created_at: true });
export type InsertFrota = z.infer<typeof insertFrotaSchema>;
export type Frota = typeof frotaTable.$inferSelect;
