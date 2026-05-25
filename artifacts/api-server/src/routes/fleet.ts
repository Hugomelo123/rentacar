import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, frotaTable, reservasTable } from "@workspace/db";
import { tryDb } from "../lib/db-safe";
import { getDemoFleetById, listDemoFleet } from "../lib/demo-mode";
import {
  ListFleetQueryParams,
  CreateVehicleBody,
  GetVehicleParams,
  GetVehicleResponse,
  UpdateVehicleParams,
  UpdateVehicleBody,
  UpdateVehicleResponse,
  DeleteVehicleParams,
  ListFleetResponse,
  ToggleVehicleStatusParams,
  ToggleVehicleStatusBody,
  ToggleVehicleStatusResponse,
  GetVehicleDamageHistoryParams,
  GetVehicleDamageHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseVehicle(v: Record<string, unknown>) {
  return {
    ...v,
    preco_base_dia: parseFloat(v.preco_base_dia as string ?? "0"),
    valor_caucao: parseFloat(v.valor_caucao as string ?? "0"),
    extra_franquia_zero: parseFloat(v.extra_franquia_zero as string ?? "0"),
    created_at: v.created_at ? String(v.created_at) : null,
  };
}

router.get("/fleet", async (req, res): Promise<void> => {
  const parsed = ListFleetQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const status = parsed.data.status as
    | "disponivel"
    | "alugado"
    | "manutencao"
    | "reservado_temporario"
    | undefined;

  const fromDb = await tryDb(async () => {
    let query = db.select().from(frotaTable).$dynamic();
    if (status) {
      query = query.where(eq(frotaTable.status, status));
    }
    return query;
  });

  const vehicles =
    fromDb && fromDb.length > 0
      ? fromDb
      : listDemoFleet(status);

  res.json(ListFleetResponse.parse(vehicles.map((v) => parseVehicle(v as unknown as Record<string, unknown>))));
});

router.post("/fleet", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vehicle] = await db.insert(frotaTable).values({
    ...parsed.data,
    preco_base_dia: String(parsed.data.preco_base_dia),
    valor_caucao: String(parsed.data.valor_caucao),
    extra_franquia_zero: String(parsed.data.extra_franquia_zero),
  }).returning();

  res.status(201).json(GetVehicleResponse.parse(parseVehicle(vehicle as unknown as Record<string, unknown>)));
});

router.get("/fleet/:id", async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const fromDb = await tryDb(() =>
    db.select().from(frotaTable).where(eq(frotaTable.id, params.data.id)),
  );
  const vehicle = fromDb?.[0] ?? getDemoFleetById(params.data.id);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(GetVehicleResponse.parse(parseVehicle(vehicle as unknown as Record<string, unknown>)));
});

router.patch("/fleet/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.marca_modelo !== undefined) updateData.marca_modelo = parsed.data.marca_modelo;
  if (parsed.data.categoria !== undefined) updateData.categoria = parsed.data.categoria;
  if (parsed.data.foto_url !== undefined) updateData.foto_url = parsed.data.foto_url;
  if (parsed.data.preco_base_dia !== undefined) updateData.preco_base_dia = String(parsed.data.preco_base_dia);
  if (parsed.data.valor_caucao !== undefined) updateData.valor_caucao = String(parsed.data.valor_caucao);
  if (parsed.data.extra_franquia_zero !== undefined) updateData.extra_franquia_zero = String(parsed.data.extra_franquia_zero);
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [vehicle] = await db
    .update(frotaTable)
    .set(updateData)
    .where(eq(frotaTable.id, params.data.id))
    .returning();

  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(UpdateVehicleResponse.parse(parseVehicle(vehicle as unknown as Record<string, unknown>)));
});

router.delete("/fleet/:id", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vehicle] = await db
    .delete(frotaTable)
    .where(eq(frotaTable.id, params.data.id))
    .returning();

  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/fleet/:id/toggle-status", async (req, res): Promise<void> => {
  const params = ToggleVehicleStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ToggleVehicleStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vehicle] = await db
    .update(frotaTable)
    .set({ status: parsed.data.status })
    .where(eq(frotaTable.id, params.data.id))
    .returning();

  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(ToggleVehicleStatusResponse.parse(parseVehicle(vehicle as unknown as Record<string, unknown>)));
});

router.get("/fleet/:id/damage-history", async (req, res): Promise<void> => {
  const params = GetVehicleDamageHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reservations = await db
    .select()
    .from(reservasTable)
    .where(
      and(
        eq(reservasTable.veiculo_id, params.data.id),
      )
    );

  const history = reservations
    .filter((r) => r.fotos_estado_carro != null)
    .map((r) => ({
      reservation_id: r.id,
      cliente_nome: r.cliente_nome,
      fotos: Object.values(r.fotos_estado_carro as Record<string, string>),
      created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
    }));

  res.json(GetVehicleDamageHistoryResponse.parse(history));
});

export default router;
