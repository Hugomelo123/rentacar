-- Schema Autocunha (idempotente para re-runs locais)
DO $$ BEGIN CREATE TYPE "categoria" AS ENUM ('Economico', 'Familiar', 'SUV', 'Premium'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "vehicle_status" AS ENUM ('disponivel', 'alugado', 'manutencao', 'reservado_temporario'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tipo_protecao" AS ENUM ('standard_com_caucao', 'franquia_zero'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "status_pagamento" AS ENUM ('pendente', 'pago_sinal', 'falhado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "status_reserva" AS ENUM ('criada', 'checkin_feito', 'carro_na_estrada', 'concluida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "sos_status" AS ENUM ('ativo', 'resolvido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "config_operacao" (
  "id" serial PRIMARY KEY,
  "horario_abertura" text NOT NULL DEFAULT '08:00',
  "horario_fecho" text NOT NULL DEFAULT '22:00',
  "taxa_noturna" numeric(10,2) NOT NULL DEFAULT 30.00,
  "idade_minima" integer NOT NULL DEFAULT 21,
  "taxa_condutor_jovem" numeric(10,2) NOT NULL DEFAULT 15.00,
  "stripe_secret_key" text,
  "stripe_webhook_secret" text
);

CREATE TABLE IF NOT EXISTS "frota" (
  "id" serial PRIMARY KEY,
  "marca_modelo" text NOT NULL,
  "categoria" "categoria" NOT NULL,
  "foto_url" text,
  "preco_base_dia" numeric(10,2) NOT NULL,
  "valor_caucao" numeric(10,2) NOT NULL,
  "extra_franquia_zero" numeric(10,2) NOT NULL,
  "status" "vehicle_status" NOT NULL DEFAULT 'disponivel',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reservas" (
  "id" serial PRIMARY KEY,
  "cliente_telefone" text NOT NULL,
  "cliente_nome" text NOT NULL,
  "cliente_idioma" text,
  "veiculo_id" integer NOT NULL REFERENCES "frota"("id"),
  "tipo_protecao" "tipo_protecao" NOT NULL,
  "data_levantamento" text NOT NULL,
  "data_devolucao" text NOT NULL,
  "hora_chegada_voo" text,
  "taxa_noturna_aplicada" numeric(10,2),
  "valor_total" numeric(10,2) NOT NULL,
  "status_pagamento" "status_pagamento" NOT NULL DEFAULT 'pendente',
  "status_reserva" "status_reserva" NOT NULL DEFAULT 'criada',
  "docs_checkin_url" jsonb,
  "fotos_estado_carro" jsonb,
  "stripe_intent_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "alertas_sos" (
  "id" serial PRIMARY KEY,
  "reserva_id" integer NOT NULL REFERENCES "reservas"("id"),
  "localizacao_latitude" numeric(10,6),
  "localizacao_longitude" numeric(10,6),
  "foto_problema_url" text,
  "status" "sos_status" NOT NULL DEFAULT 'ativo',
  "created_at" timestamp DEFAULT now()
);
