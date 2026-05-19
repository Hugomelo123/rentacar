import { pgTable, serial, integer, decimal, text, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { reservasTable } from "./reservas";

export const sosStatusEnum = pgEnum("sos_status", ["ativo", "resolvido"]);

export const alertasSosTable = pgTable("alertas_sos", {
  id: serial("id").primaryKey(),
  reserva_id: integer("reserva_id").notNull().references(() => reservasTable.id),
  localizacao_latitude: decimal("localizacao_latitude", { precision: 10, scale: 6 }),
  localizacao_longitude: decimal("localizacao_longitude", { precision: 10, scale: 6 }),
  foto_problema_url: text("foto_problema_url"),
  status: sosStatusEnum("status").notNull().default("ativo"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAlertaSosSchema = createInsertSchema(alertasSosTable).omit({ id: true, created_at: true });
export type InsertAlertaSos = z.infer<typeof insertAlertaSosSchema>;
export type AlertaSos = typeof alertasSosTable.$inferSelect;
