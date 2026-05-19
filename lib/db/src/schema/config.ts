import { pgTable, serial, time, decimal, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const configOperacaoTable = pgTable("config_operacao", {
  id: serial("id").primaryKey(),
  horario_abertura: text("horario_abertura").notNull().default("08:00"),
  horario_fecho: text("horario_fecho").notNull().default("22:00"),
  taxa_noturna: decimal("taxa_noturna", { precision: 10, scale: 2 }).notNull().default("30.00"),
  idade_minima: integer("idade_minima").notNull().default(21),
  taxa_condutor_jovem: decimal("taxa_condutor_jovem", { precision: 10, scale: 2 }).notNull().default("15.00"),
  stripe_secret_key: text("stripe_secret_key"),
  stripe_webhook_secret: text("stripe_webhook_secret"),
});

export const insertConfigSchema = createInsertSchema(configOperacaoTable).omit({ id: true });
export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof configOperacaoTable.$inferSelect;
